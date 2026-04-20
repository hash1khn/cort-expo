import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '../../core/config/env';
import { tokenStorage } from '../../features/auth/utils/tokenStorage';

type TripType = 'shuttle' | 'chauffeur';

interface QueuedLocationPoint {
  tripId: string;
  tripType?: TripType;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  clientTs: number;
}

interface BatchPayload {
  tripId: string;
  tripType?: TripType;
  points: Array<{
    lat: number;
    lng: number;
    heading: number;
    speed: number;
    clientTs: number;
  }>;
}

interface BatchSendResult {
  ok: boolean;
  retryable: boolean;
}

const OFFLINE_LOCATION_QUEUE_KEY = 'CORT_OFFLINE_LOCATION_QUEUE_V1';
const OFFLINE_LOCATION_METRICS_KEY = 'CORT_OFFLINE_LOCATION_METRICS_V1';
const MAX_QUEUE_POINTS = 5000;
const FLUSH_BATCH_SIZE = 100;
const MAX_BACKOFF_MS = 120_000;
const BASE_BACKOFF_MS = 2_000;

interface SyncMetrics {
  enqueued: number;
  droppedOverflow: number;
  flushAttempts: number;
  flushSuccesses: number;
  flushFailures: number;
  pointsFlushed: number;
  pointsDroppedNonRetryable: number;
  lastFlushAt: number | null;
  lastErrorAt: number | null;
}

let flushPromise: Promise<{ flushed: number; remaining: number }> | null = null;
let consecutiveFailures = 0;
let backoffUntilTs = 0;

const DEFAULT_METRICS: SyncMetrics = {
  enqueued: 0,
  droppedOverflow: 0,
  flushAttempts: 0,
  flushSuccesses: 0,
  flushFailures: 0,
  pointsFlushed: 0,
  pointsDroppedNonRetryable: 0,
  lastFlushAt: null,
  lastErrorAt: null,
};

async function readQueue(): Promise<QueuedLocationPoint[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_LOCATION_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as QueuedLocationPoint[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(points: QueuedLocationPoint[]): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_LOCATION_QUEUE_KEY, JSON.stringify(points));
}

async function readMetrics(): Promise<SyncMetrics> {
  const raw = await AsyncStorage.getItem(OFFLINE_LOCATION_METRICS_KEY);
  if (!raw) return { ...DEFAULT_METRICS };
  try {
    const parsed = JSON.parse(raw) as Partial<SyncMetrics>;
    return { ...DEFAULT_METRICS, ...parsed };
  } catch {
    return { ...DEFAULT_METRICS };
  }
}

async function writeMetrics(metrics: SyncMetrics): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_LOCATION_METRICS_KEY, JSON.stringify(metrics));
}

async function updateMetrics(updater: (current: SyncMetrics) => SyncMetrics): Promise<SyncMetrics> {
  const current = await readMetrics();
  const next = updater(current);
  await writeMetrics(next);
  return next;
}

function canSendPoint(point: QueuedLocationPoint): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

function takeBatch(queue: QueuedLocationPoint[]): QueuedLocationPoint[] {
  if (!queue.length) return [];
  const first = queue[0];
  const batch: QueuedLocationPoint[] = [];

  for (const point of queue) {
    if (batch.length >= FLUSH_BATCH_SIZE) break;
    if (point.tripId !== first.tripId || point.tripType !== first.tripType) break;
    batch.push(point);
  }

  return batch;
}

async function sendBatch(payload: BatchPayload): Promise<BatchSendResult> {
  let token = await tokenStorage.getAccessToken();
  if (!token) return { ok: false, retryable: true };

  const request = async (accessToken: string) =>
    fetch(`${env.API_URL}/rides/location/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

  try {
    let response = await request(token);
    if (response.status === 401) {
      const refreshed = await tokenStorage.refreshAccessToken();
      if (!refreshed) return { ok: false, retryable: true };
      token = refreshed;
      response = await request(token);
    }

    if (response.ok) return { ok: true, retryable: true };
    if (response.status >= 400 && response.status < 500 && response.status !== 401) {
      return { ok: false, retryable: false };
    }
    return { ok: false, retryable: true };
  } catch {
    return { ok: false, retryable: true };
  }
}

export async function enqueueLocationPoint(point: QueuedLocationPoint): Promise<void> {
  if (!canSendPoint(point)) return;

  const queue = await readQueue();
  const previousLength = queue.length;
  queue.push(point);
  if (queue.length > MAX_QUEUE_POINTS) {
    queue.splice(0, queue.length - MAX_QUEUE_POINTS);
  }
  await writeQueue(queue);

  const droppedOverflow = Math.max(0, previousLength + 1 - queue.length);
  await updateMetrics((metrics) => ({
    ...metrics,
    enqueued: metrics.enqueued + 1,
    droppedOverflow: metrics.droppedOverflow + droppedOverflow,
  }));
}

export async function flushOfflineLocationQueue(): Promise<{ flushed: number; remaining: number }> {
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    const now = Date.now();
    let queue = await readQueue();
    let flushed = 0;
    let droppedNonRetryable = 0;

    if (now < backoffUntilTs) {
      return { flushed: 0, remaining: queue.length };
    }

    while (queue.length > 0) {
      const batch = takeBatch(queue);
      if (!batch.length) break;

      const payload: BatchPayload = {
        tripId: batch[0].tripId,
        tripType: batch[0].tripType,
        points: batch.map((point) => ({
          lat: point.lat,
          lng: point.lng,
          heading: point.heading,
          speed: point.speed,
          clientTs: point.clientTs,
        })),
      };

      const sendResult = await sendBatch(payload);
      await updateMetrics((metrics) => ({
        ...metrics,
        flushAttempts: metrics.flushAttempts + 1,
      }));
      if (!sendResult.ok) {
        if (!sendResult.retryable) {
          queue = queue.slice(batch.length);
          droppedNonRetryable += batch.length;
          await writeQueue(queue);
          continue;
        }

        consecutiveFailures += 1;
        const exponentialDelay = Math.min(
          MAX_BACKOFF_MS,
          BASE_BACKOFF_MS * 2 ** Math.max(0, consecutiveFailures - 1),
        );
        const jitter = Math.floor(Math.random() * 500);
        backoffUntilTs = Date.now() + exponentialDelay + jitter;

        await updateMetrics((metrics) => ({
          ...metrics,
          flushFailures: metrics.flushFailures + 1,
          lastErrorAt: Date.now(),
        }));

        break;
      }

      queue = queue.slice(batch.length);
      flushed += batch.length;
      await writeQueue(queue);
      consecutiveFailures = 0;
      backoffUntilTs = 0;
      await updateMetrics((metrics) => ({
        ...metrics,
        flushSuccesses: metrics.flushSuccesses + 1,
        pointsFlushed: metrics.pointsFlushed + batch.length,
        lastFlushAt: Date.now(),
      }));
    }

    const metrics = await readMetrics();
    const successRate =
      metrics.flushAttempts > 0
        ? ((metrics.flushSuccesses / metrics.flushAttempts) * 100).toFixed(1)
        : '100.0';
    if (flushed > 0 || queue.length > 0) {
      console.log(
        `[LocationSync] flushed=${flushed} remaining=${queue.length} backoffMs=${Math.max(
          0,
          backoffUntilTs - Date.now(),
        )} successRate=${successRate}%`,
      );
    }

    if (droppedNonRetryable > 0) {
      await updateMetrics((current) => ({
        ...current,
        pointsDroppedNonRetryable: current.pointsDroppedNonRetryable + droppedNonRetryable,
      }));
    }

    return { flushed, remaining: queue.length };
  })();

  try {
    return await flushPromise;
  } finally {
    flushPromise = null;
  }
}

export async function clearOfflineLocationQueue(): Promise<void> {
  await AsyncStorage.removeItem(OFFLINE_LOCATION_QUEUE_KEY);
  await AsyncStorage.removeItem(OFFLINE_LOCATION_METRICS_KEY);
  consecutiveFailures = 0;
  backoffUntilTs = 0;
}

export async function getOfflineLocationSyncMetrics(): Promise<SyncMetrics> {
  return readMetrics();
}

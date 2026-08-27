import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { socketService } from '../socket.service';
import { tokenStorage } from '../../features/auth/utils/tokenStorage';
import { enqueueLocationPoint, flushOfflineLocationQueue, resetFlushBackoff } from './offlineLocationQueue';

/**
 * Battery snapshot to attach to tracking-lifecycle logs. `batteryOptimizationEnabled`
 * is Android-only and is exactly the per-app Doze exemption setting suspected in the
 * "process silently killed mid-trip" investigation — if a death correlates with this
 * being true (or with low battery generally), that points straight at OS battery
 * management as the mechanism; if deaths happen at full battery with optimization
 * off too, that rules it out. Never throws — battery APIs can fail on some devices.
 */
export async function getBatterySnapshot(): Promise<Record<string, unknown>> {
  try {
    const [power, batteryOptimizationEnabled] = await Promise.all([
      Battery.getPowerStateAsync(),
      Battery.isBatteryOptimizationEnabledAsync().catch(() => null),
    ]);
    return {
      batteryLevel: power.batteryLevel < 0 ? null : Math.round(power.batteryLevel * 100),
      batteryState: Battery.BatteryState[power.batteryState] ?? power.batteryState,
      lowPowerMode: power.lowPowerMode,
      batteryOptimizationEnabled,
    };
  } catch {
    return {};
  }
}

/**
 * Resets to 0 on every fresh JS process (cold start or headless spin-up).
 * A gap where this never advances again for a trip that's still supposedly
 * active — with no reset in between — is the "task registered but silently
 * not delivering" symptom we're trying to catch.
 */
let invocationCounter = 0;

/**
 * Trip IDs the task has fired at least once for since this JS process
 * started, plus any callers currently waiting on a first fire. Backs
 * waitForFirstTaskInvocation() below — see that function's doc comment for
 * why this exists.
 */
const deliveredTripIds = new Set<string>();
const firstDeliveryResolvers = new Map<string, Array<() => void>>();

function notifyTaskAlive(tripId: string | null): void {
  if (!tripId) return;
  deliveredTripIds.add(tripId);
  const resolvers = firstDeliveryResolvers.get(tripId);
  if (resolvers) {
    resolvers.forEach((resolve) => resolve());
    firstDeliveryResolvers.delete(tripId);
  }
}

/**
 * Resolves once the background task has actually been invoked by the OS at
 * least once for this trip (any invocation — error, empty-locations, or a
 * real fix all count, since what we're confirming is that the native
 * subscription is genuinely alive and wired to this JS callback, not
 * specifically that a GPS fix arrived). Resolves `false` after `timeoutMs`
 * if nothing fires in time, so a caller never blocks forever.
 *
 * Exists to close the race where a caller opens Google Maps (backgrounding
 * the app) immediately after startLocationTracking()'s promise resolves —
 * on Android that promise resolving does NOT guarantee the foreground
 * service has finished its async handshake, so backgrounding too early can
 * leave the task registered but silently dead for the rest of the trip.
 * Callers should await this before doing anything that backgrounds the app.
 */
export function waitForFirstTaskInvocation(tripId: string, timeoutMs: number): Promise<boolean> {
  if (deliveredTripIds.has(tripId)) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;
    const settle = (delivered: boolean) => {
      if (settled) return;
      settled = true;
      resolve(delivered);
    };

    const resolvers = firstDeliveryResolvers.get(tripId) ?? [];
    resolvers.push(() => settle(true));
    firstDeliveryResolvers.set(tripId, resolvers);

    setTimeout(() => settle(false), timeoutMs);
  });
}

/**
 * AsyncStorage key that holds the active ride / booking ID while a ride is
 * in progress.  It is written before startLocationUpdatesAsync is called and
 * deleted when stopLocationUpdatesAsync is called so the background task
 * always knows which trip to attach location updates to.
 */
export const ACTIVE_RIDE_KEY = 'CORT_ACTIVE_RIDE_ID';
export const ACTIVE_RIDE_TYPE_KEY = 'CORT_ACTIVE_RIDE_TYPE';

/**
 * Unique task name used by TaskManager and expo-location.
 * Must be a stable string - changing it requires a new build.
 */
export const RIDER_LOCATION_TASK = 'CORT_RIDER_LOCATION';

/**
 * ⚠️  This defineTask call MUST live at module scope (not inside any React
 * component or hook). The OS can spin up a minimal JS runtime just to run
 * this task while all React views are unmounted, so the definition must be
 * reachable without mounting anything.
 *
 * This file is imported once in app/_layout.tsx BEFORE the component tree
 * renders, which satisfies that requirement.
 */
TaskManager.defineTask(
  RIDER_LOCATION_TASK,
  async ({
    data,
    error,
  }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
    invocationCounter += 1;

    // Signal "the subscription is alive" regardless of what this particular
    // invocation contains — see waitForFirstTaskInvocation()'s doc comment.
    notifyTaskAlive(await AsyncStorage.getItem(ACTIVE_RIDE_KEY));

    if (error) {
      // kCLErrorLocationUnknown (Code=0) is transient — the OS couldn't get a
      // GPS fix at this exact moment. The task will be invoked again on the
      // next update so we just ignore it to avoid noisy logs.
      if (!error.message?.includes('Code=0')) {
        console.warn('[RiderLocation] Task error:', error.message);
        Sentry.logger.error('[RiderLocation] task error', {
          invocation: invocationCounter,
          message: error.message,
        });
      }
      return;
    }

    if (!data?.locations?.length) {
      // Task fired but with no locations — distinct from not firing at all.
      Sentry.logger.warn('[RiderLocation] task fired with no locations', {
        invocation: invocationCounter,
      });
      return;
    }

    const location = data.locations[0];
    const { latitude, longitude, speed, heading } = location.coords;
    const clientTs = location.timestamp || Date.now();
    const coords = {
      lat: latitude,
      lng: longitude,
      speed: speed ?? 0,
      heading: heading ?? 0,
      clientTs,
    };

    try {
      const tripId = await AsyncStorage.getItem(ACTIVE_RIDE_KEY);
      if (!tripId) return;
      const tripType = (await AsyncStorage.getItem(ACTIVE_RIDE_TYPE_KEY)) as 'shuttle' | 'chauffeur' | null;

      // If socket dropped, attempt to reconnect before deciding which path to use.
      if (!socketService.isConnected()) {
        try {
          const token = await tokenStorage.getAccessToken();
          if (token) socketService.connect(token);
        } catch { /* non-fatal */ }
      }

      const path = socketService.isConnected() ? 'socket' : 'offline_queue';
      Sentry.logger.info('[RiderLocation] task invocation', {
        invocation: invocationCounter,
        tripId,
        tripType: tripType ?? null,
        path,
        ...(await getBatterySnapshot()),
      });

      if (path === 'socket') {
        // Live path: send immediately via WebSocket.
        // Do NOT also enqueue — that would double-send every point (once via
        // socket to ride.gateway.ts, once via HTTP flush to rides.controller.ts).
        socketService.sendLocationUpdate(tripId, coords);

        // Drain any points that were buffered while the socket was down.
        resetFlushBackoff();
        flushOfflineLocationQueue().catch(() => null);
      } else {
        // Offline path: buffer for HTTP flush once connectivity returns.
        await enqueueLocationPoint({
          tripId,
          tripType: tripType ?? undefined,
          lat: coords.lat,
          lng: coords.lng,
          speed: coords.speed,
          heading: coords.heading,
          clientTs: coords.clientTs,
        });
      }
    } catch (e) {
      console.warn('[RiderLocation] Failed to send location update:', e);
      Sentry.logger.error('[RiderLocation] failed to send location update', {
        invocation: invocationCounter,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Sentry from '@sentry/react-native';
import {
  ACTIVE_RIDE_KEY,
  ACTIVE_RIDE_TYPE_KEY,
  RIDER_LOCATION_TASK,
  getBatterySnapshot,
  markTrackingStarted,
  getMsSinceLastActivity,
} from './backgroundLocationTask';
import { flushOfflineLocationQueue, dropQueuePointsForOtherTrips } from './offlineLocationQueue';

/**
 * Per-tripId in-flight guard — mirrors tokenStorage.ts's refreshInFlight
 * pattern. startLocationTracking's stop-then-restart body is NOT idempotent
 * (each call tears down and rebuilds the native subscription mid-handshake),
 * so a caller re-invoked before the first attempt settles — e.g. a driver
 * re-tapping "Begin Ride" because the UI gave no feedback while the first
 * tap was still waiting on confirmation — must reuse the same in-flight
 * attempt rather than starting a fresh teardown/rebuild cycle on top of it.
 * This is what let a real trip get 13 restart cycles in 10 seconds and never
 * recover. Cleared in `finally` so a genuine failure still allows an
 * immediate, fully-fresh retry — only a truly concurrent call is deduped.
 */
const startInFlight = new Map<string, Promise<void>>();

/**
 * Saves the ride ID to AsyncStorage and starts the background location task.
 *
 * Safe to call even if the task is already running — if isTaskRegisteredAsync
 * finds a stale registration (e.g. left over from a previous trip in the
 * same still-alive process), it's stopped and restarted fresh rather than
 * left as-is.
 *
 * Safe to call concurrently for the same tripId, too — see startInFlight
 * above. A concurrent call for a *different* tripId is not deduped against
 * this one; it proceeds normally (and will itself observe the other trip's
 * task as "already running" via the usual stop-then-restart path).
 *
 * ⚠️  This function's promise resolving does NOT mean the task is actually
 * delivering yet — on Android, the native foreground service backing
 * reliable background GPS delivery finishes its handshake asynchronously,
 * slightly after this call returns. Doing anything here that backgrounds the
 * app (e.g. opening Google Maps) before that handshake completes can leave
 * the task silently dead for the rest of the trip. Callers that need to
 * background the app after starting tracking should go through
 * useRiderLocationTracking()'s startTracking(), which awaits
 * waitForFirstTaskInvocation() first — don't call this directly for that
 * case.
 *
 * @param tripId    The shuttle tripId or chauffeur bookingId for this ride.
 * @param tripType  'shuttle' | 'chauffeur' — stored so the HTTP fallback can
 *                  pass it to the server for geofence routing.
 */
export function startLocationTracking(tripId: string | number, tripType?: 'shuttle' | 'chauffeur'): Promise<void> {
  const newTripId = String(tripId);
  const existing = startInFlight.get(newTripId);
  if (existing) {
    Sentry.logger.info('[RiderLocation] startLocationTracking — reusing in-flight attempt', { tripId: newTripId });
    return existing;
  }

  const attempt = startLocationTrackingImpl(newTripId, tripType).finally(() => {
    startInFlight.delete(newTripId);
  });
  startInFlight.set(newTripId, attempt);
  return attempt;
}

async function startLocationTrackingImpl(newTripId: string, tripType?: 'shuttle' | 'chauffeur'): Promise<void> {
  // Reset the watchdog's "last sign of life" clock — see markTrackingStarted's
  // doc comment. Every restart (including a watchdog-triggered one) gets its
  // own fresh grace period before being judged silent again.
  markTrackingStarted();

  // Log tripId transitions — helps trace stale-context bugs in production.
  const previousTripId = await AsyncStorage.getItem(ACTIVE_RIDE_KEY);
  if (previousTripId && previousTripId !== newTripId) {
    console.warn(`[RiderLocation] Trip context transition: ${previousTripId} → ${newTripId}`);
  }

  // Write new trip context FIRST so any subsequent queue writes are stamped correctly.
  await AsyncStorage.setItem(ACTIVE_RIDE_KEY, newTripId);
  if (tripType) {
    await AsyncStorage.setItem(ACTIVE_RIDE_TYPE_KEY, tripType);
  } else {
    await AsyncStorage.removeItem(ACTIVE_RIDE_TYPE_KEY);
  }

  // Drop any queued points that belong to a previous trip before flushing,
  // so we don't send stale-trip data to the server under the new ride session.
  await dropQueuePointsForOtherTrips(newTripId);

  // Flush now — queue only contains points for the current trip.
  flushOfflineLocationQueue().catch(() => null);

  // A registered task doesn't guarantee live GPS delivery — after sitting
  // idle overnight (Doze / OEM battery managers), the subscription can go
  // stale while still reporting as registered, silently dropping the next
  // trip's location updates. Restart it so every new ride starts fresh.
  const alreadyRunning = await TaskManager.isTaskRegisteredAsync(RIDER_LOCATION_TASK);

  // Diagnostic: alreadyRunning=true means this is a 2nd+ start/stop cycle
  // within the same still-alive process — the exact condition suspected of
  // leaving the Android foreground service in a stale state (see
  // LocationTaskConsumer.kt's mService not being nulled by stopForegroundService).
  Sentry.logger.info('[RiderLocation] startLocationTracking', {
    tripId: newTripId,
    tripType: tripType ?? null,
    alreadyRunning,
    ...(await getBatterySnapshot()),
  });

  if (alreadyRunning) {
    await Location.stopLocationUpdatesAsync(RIDER_LOCATION_TASK);
  }

  await Location.startLocationUpdatesAsync(RIDER_LOCATION_TASK, {
    // BestForNavigation gives the highest possible accuracy and is the
    // correct activity type for drivers actively navigating.
    accuracy: Location.Accuracy.BestForNavigation,
    activityType: Location.ActivityType.AutomotiveNavigation,
    // Fire every 5 s OR every 10 m — whichever comes first.
    timeInterval: 5000,
    distanceInterval: 10,
    // Android: disable OS-level deferral of GPS callbacks (Doze / power-save
    // modes can batch updates even with a foreground service running).
    deferredUpdatesInterval: 0,
    deferredUpdatesDistance: 0,
    // iOS: show the blue status-bar indicator while tracking is active.
    showsBackgroundLocationIndicator: true,
    // Disable iOS automatic pause (pauses on no movement).
    pausesUpdatesAutomatically: false,
    // Android: foreground service notification keeps the JS process alive
    // and satisfies the OS constraint for background location access.
    foregroundService: {
      notificationTitle: 'Active Ride',
      notificationBody: 'Traflinq is sharing your location during this ride.',
      notificationColor: '#F4593B',
    },
  });
}

/**
 * How stale "no sign of life" has to be before the watchdog treats tracking
 * as silently broken and tries to re-arm it. Generous relative to the ~5s
 * normal invocation cadence — this only fires on a genuine, sustained gap,
 * not an ordinary brief lull between fixes.
 */
const WATCHDOG_STALE_THRESHOLD_MS = 90_000;

/**
 * Call periodically (see useRiderLocationTracking's watchdog interval) while
 * a ride is supposedly active. If tracking has gone silent for longer than
 * WATCHDOG_STALE_THRESHOLD_MS — the exact failure mode behind trips
 * 1470/1504/1537/1524, where a start that looked healthy never delivers
 * again and nothing ever checks back — re-arms it via startLocationTracking().
 * Safe to call repeatedly: if a ride isn't active, or the last activity is
 * recent enough to be healthy, this is a no-op. Never throws.
 *
 * Note what this can't do: if the OS has killed the whole JS process (not
 * just the task), nothing here is running either — this only helps while the
 * app is genuinely alive. See _layout.tsx's boot-time reconciliation effect
 * for the complementary fix that covers a relaunch after a full process kill.
 */
export async function runTrackingWatchdogCheck(): Promise<void> {
  try {
    const activeRideId = await AsyncStorage.getItem(ACTIVE_RIDE_KEY);
    if (!activeRideId) return;

    const msSinceActivity = getMsSinceLastActivity();
    if (msSinceActivity == null || msSinceActivity < WATCHDOG_STALE_THRESHOLD_MS) return;

    const tripType = (await AsyncStorage.getItem(ACTIVE_RIDE_TYPE_KEY)) as 'shuttle' | 'chauffeur' | null;

    Sentry.logger.warn('[RiderLocation] watchdog: no activity, re-arming tracking', {
      tripId: activeRideId,
      msSinceActivity,
    });

    await startLocationTracking(activeRideId, tripType ?? undefined);
  } catch (e) {
    Sentry.logger.error('[RiderLocation] watchdog: re-arm attempt failed', {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Stops the background location task and removes the stored ride ID.
 *
 * Safe to call even when tracking is not running.
 */
export async function stopLocationTracking(): Promise<void> {
  const tripIdAtStop = await AsyncStorage.getItem(ACTIVE_RIDE_KEY);
  await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
  await AsyncStorage.removeItem(ACTIVE_RIDE_TYPE_KEY);

  const isRunning = await TaskManager.isTaskRegisteredAsync(RIDER_LOCATION_TASK);
  Sentry.logger.info('[RiderLocation] stopLocationTracking', {
    tripId: tripIdAtStop,
    wasRunning: isRunning,
  });
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(RIDER_LOCATION_TASK);
  }

  // Flush any remaining buffered points after tracking stops.
  flushOfflineLocationQueue().catch(() => null);
}

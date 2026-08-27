import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Sentry from '@sentry/react-native';
import { ACTIVE_RIDE_KEY, ACTIVE_RIDE_TYPE_KEY, RIDER_LOCATION_TASK, getBatterySnapshot } from './backgroundLocationTask';
import { flushOfflineLocationQueue, dropQueuePointsForOtherTrips } from './offlineLocationQueue';

/**
 * Saves the ride ID to AsyncStorage and starts the background location task.
 *
 * Safe to call even if the task is already running — if isTaskRegisteredAsync
 * finds a stale registration (e.g. left over from a previous trip in the
 * same still-alive process), it's stopped and restarted fresh rather than
 * left as-is.
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
export async function startLocationTracking(tripId: string | number, tripType?: 'shuttle' | 'chauffeur'): Promise<void> {
  const newTripId = String(tripId);

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

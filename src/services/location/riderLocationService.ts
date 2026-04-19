import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { ACTIVE_RIDE_KEY, ACTIVE_RIDE_TYPE_KEY, RIDER_LOCATION_TASK } from './backgroundLocationTask';

/**
 * Saves the ride ID to AsyncStorage and starts the background location task.
 *
 * Safe to call even if the task is already running — isTaskRegisteredAsync
 * guards against double registration.
 *
 * @param tripId    The shuttle tripId or chauffeur bookingId for this ride.
 * @param tripType  'shuttle' | 'chauffeur' — stored so the HTTP fallback can
 *                  pass it to the server for geofence routing.
 */
export async function startLocationTracking(tripId: string | number, tripType?: 'shuttle' | 'chauffeur'): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_RIDE_KEY, String(tripId));
  if (tripType) {
    await AsyncStorage.setItem(ACTIVE_RIDE_TYPE_KEY, tripType);
  }

  const alreadyRunning = await TaskManager.isTaskRegisteredAsync(RIDER_LOCATION_TASK);
  if (alreadyRunning) return;

  await Location.startLocationUpdatesAsync(RIDER_LOCATION_TASK, {
    // BestForNavigation gives the highest possible accuracy and is the
    // correct activity type for drivers actively navigating.
    accuracy: Location.Accuracy.BestForNavigation,
    activityType: Location.ActivityType.AutomotiveNavigation,
    // Fire every 5 s OR every 10 m — whichever comes first.
    timeInterval: 5000,
    distanceInterval: 10,
    // iOS: show the blue status-bar indicator while tracking is active.
    showsBackgroundLocationIndicator: true,
    // Disable iOS automatic pause (pauses on no movement).
    pausesUpdatesAutomatically: false,
    // Android: foreground service notification keeps the JS process alive
    // and satisfies the OS constraint for background location access.
    foregroundService: {
      notificationTitle: 'Active Ride',
      notificationBody: 'Cort is sharing your location during this ride.',
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
  await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
  await AsyncStorage.removeItem(ACTIVE_RIDE_TYPE_KEY);

  const isRunning = await TaskManager.isTaskRegisteredAsync(RIDER_LOCATION_TASK);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(RIDER_LOCATION_TASK);
  }
}

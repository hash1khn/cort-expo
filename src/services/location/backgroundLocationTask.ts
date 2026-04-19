import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '../socket.service';
import { tokenStorage } from '../../features/auth/utils/tokenStorage';
import { env } from '../../core/config/env';

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
    if (error) {
      // kCLErrorLocationUnknown (Code=0) is transient — the OS couldn't get a
      // GPS fix at this exact moment. The task will be invoked again on the
      // next update so we just ignore it to avoid noisy logs.
      if (!error.message?.includes('Code=0')) {
        console.warn('[RiderLocation] Task error:', error.message);
      }
      return;
    }

    if (!data?.locations?.length) return;

    const location = data.locations[0];
    const { latitude, longitude, speed, heading } = location.coords;
    const coords = {
      lat: latitude,
      lng: longitude,
      speed: speed ?? 0,
      heading: heading ?? 0,
    };

    try {
      const tripId = await AsyncStorage.getItem(ACTIVE_RIDE_KEY);
      if (!tripId) return;
      const tripType = (await AsyncStorage.getItem(ACTIVE_RIDE_TYPE_KEY)) as 'shuttle' | 'chauffeur' | null;

      // Prefer the shared socket instance when it is still connected
      // (Android foreground service keeps the JS process alive so the socket
      // normally stays up; useSocketConnection skips disconnecting when a
      // ride is active).
      if (socketService.isConnected()) {
        socketService.sendLocationUpdate(tripId, coords);
        return;
      }

      // Fallback: plain HTTP POST when socket is unavailable
      const token = await tokenStorage.getAccessToken();
      if (!token) return;

      await fetch(`${env.API_URL}/rides/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tripId, ...coords, tripType }),
      });
    } catch (e) {
      console.warn('[RiderLocation] Failed to send location update:', e);
    }
  },
);

import { Linking, Platform } from 'react-native';
import type { Stop } from '../hooks/useActiveTrip';

/** Opens the native Maps app with directions to a single stop — used by both the
 * morning and evening driver screens to hand off to Google/Apple Maps one stop at
 * a time as the driver taps "Mark as Arrived" and advances through the route. */
export function openInMaps(stop: Pick<Stop, 'lat' | 'lng' | 'name'>): void {
  const appleUrl = `maps://?daddr=${stop.lat},${stop.lng}&dirflg=d`;
  const androidUrl = `geo:0,0?q=${stop.lat},${stop.lng}(${encodeURIComponent(stop.name)})`;
  const url = Platform.OS === 'ios' ? appleUrl : androidUrl;

  Linking.openURL(url).catch(() => {
    // swallow error; we don't want to block the UI if maps isn't available
  });
}

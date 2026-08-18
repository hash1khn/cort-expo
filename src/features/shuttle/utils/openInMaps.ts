import { Linking } from 'react-native';
import type { Stop } from '../hooks/useActiveTrip';

/** Opens Maps with directions to a single stop — used by both the morning and
 * evening driver screens to hand off to Google Maps one stop at a time as the
 * driver taps "Mark as Arrived" and advances through the route. Uses Google's
 * universal link on both platforms: it opens the Google Maps app if installed,
 * or falls back to the Google Maps webview in the browser if not. */
export function openInMaps(stop: Pick<Stop, 'lat' | 'lng' | 'name'>): void {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=driving`;

  Linking.openURL(url).catch(() => {
    // swallow error; we don't want to block the UI if maps isn't available
  });
}

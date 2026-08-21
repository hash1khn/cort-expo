import { IncomingRideRequestScreen } from '@/features/chauffeur/screens/IncomingRideRequestScreen';

/**
 * Incoming ride request (chauffeur) — marketplace broadcast detail view.
 * Navigate here when a push/socket signals a new nearby request, or when a
 * card is tapped from the nearby-requests list. Query params:
 * bookingId (required to accept/reject), lat, lng, passengerName, address,
 * totalDays, tripType (in_city | out_station)
 */
export default function IncomingRideRequestRoute() {
  return <IncomingRideRequestScreen />;
}

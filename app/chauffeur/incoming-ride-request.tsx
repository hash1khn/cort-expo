import { IncomingRideRequestScreen } from '@/features/chauffeur/screens/IncomingRideRequestScreen';

/**
 * Incoming ride request (chauffeur). Currently a UI preview with mock defaults;
 * navigate here when a push/socket signals a new request. Optional query params:
 * lat, lng, passengerName, address, tripSummary, totalDays, tripType (in_city | out_station)
 */
export default function IncomingRideRequestRoute() {
  return <IncomingRideRequestScreen />;
}

import { useMemo } from 'react';
import {
  useGetShuttleTripsForEmployeeQuery,
  type GetShuttleTripsForEmployeeParams,
  type ShuttleTripForEmployee,
} from '../services/employeeShuttleApi';

export type EmployeeStop = {
  id: number;
  name: string;
  eta: string;
  lat: number;
  lng: number;
};

function formatEta(
  stop: { morning_eta?: string | null; evening_eta?: string | null },
  direction: 'MORNING' | 'EVENING' | string | null | undefined,
): string {
  const isEvening = direction === 'EVENING';
  const raw = isEvening ? stop.evening_eta ?? null : stop.morning_eta ?? null;
  if (!raw) return '—';
  if (raw.includes('T')) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
  const [hStr, mStr = '00'] = raw.split(':');
  const hour24 = Number.parseInt(hStr, 10);
  if (Number.isNaN(hour24)) return raw;
  const minutes = mStr.padStart(2, '0');
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${hour12}:${minutes} ${suffix}`;
}

function buildStops(trip: ShuttleTripForEmployee | null): EmployeeStop[] {
  const routeStopsRaw = trip?.routes?.route_stops;
  if (!Array.isArray(routeStopsRaw) || routeStopsRaw.length === 0) return [];
  const routeStops = [...routeStopsRaw].sort((a, b) => a.sequence_order - b.sequence_order);
  const direction = trip?.direction ?? 'MORNING';
  return routeStops.map((stop) => ({
    id: stop.id,
    name: stop.name,
    eta: formatEta(stop, direction),
    lat: stop.lat ?? 0,
    lng: stop.lng ?? 0,
  }));
}

export function useEmployeeActiveTrip(params: GetShuttleTripsForEmployeeParams) {
  const { data: trips = [], isLoading } = useGetShuttleTripsForEmployeeQuery(params);

  // Prefer an active trip if one exists; otherwise fall back to the first trip (latest by backend ordering).
  const activeTrip: ShuttleTripForEmployee | null =
    trips.find((t) => t.status === 'IN_PROGRESS' || t.status === 'STARTED') ??
    (trips.length > 0 ? trips[0] : null);

  const tripId = activeTrip?.id;

  const {
    stops,
    currentStop,
    nextStopAfterCurrent,
    nextStopIndex,
    isLastStop,
    rideStarted,
  } = useMemo(() => {
    const stops = buildStops(activeTrip);
    const started = !!activeTrip?.started_at;
    if (!stops.length) {
      return {
        stops,
        currentStop: null as EmployeeStop | null,
        nextStopAfterCurrent: null as EmployeeStop | null,
        nextStopIndex: 0,
        isLastStop: false,
        rideStarted: started,
      };
    }

    const currentStopId = activeTrip?.current_stop_id ?? null;
    const indexOfCurrent =
      currentStopId == null ? -1 : stops.findIndex((s) => s.id === currentStopId);
    const nextIndex = indexOfCurrent + 1;
    const clampedNextIndex = Math.min(nextIndex, stops.length - 1);
    const isLastStop = indexOfCurrent === stops.length - 1 && indexOfCurrent >= 0;
    const currentStop = stops[clampedNextIndex] ?? null;
    const nextStopAfterCurrent =
      clampedNextIndex + 1 < stops.length ? stops[clampedNextIndex + 1] ?? null : null;

    return {
      stops,
      currentStop,
      nextStopAfterCurrent,
      nextStopIndex: clampedNextIndex,
      isLastStop,
      rideStarted: started,
    };
  }, [activeTrip]);

  return {
    activeTrip,
    tripId,
    stops,
    currentStop,
    nextStopAfterCurrent,
    nextStopIndex,
    isLastStop,
    rideStarted,
    isLoading,
  };
}


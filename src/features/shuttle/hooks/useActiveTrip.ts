import { useMemo } from 'react';
import { useGetTodayTripQuery } from '../services/shuttleApi';
import type { ShuttleTrip } from '../services/shuttleApi';

export type Stop = {
  id: number;
  name: string;
  eta: string;
  lat: number;
  lng: number;
};

function formatEta(stop: { morning_eta?: string | null; evening_eta?: string | null }, direction: 'MORNING' | 'EVENING'): string {
  const raw = direction === 'MORNING' ? stop.morning_eta ?? null : stop.evening_eta ?? null;
  if (!raw) return '—';
  if (raw.includes('T')) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  const [hStr, mStr = '00'] = raw.split(':');
  const hour24 = Number.parseInt(hStr, 10);
  if (Number.isNaN(hour24)) return raw;
  const minutes = mStr.padStart(2, '0');
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${hour12}:${minutes} ${suffix}`;
}

function buildStops(activeTrip: ShuttleTrip | null): Stop[] {
  const routeStopsRaw = activeTrip?.routes?.route_stops;
  if (!Array.isArray(routeStopsRaw) || routeStopsRaw.length === 0) return [];
  const routeStops = [...routeStopsRaw].sort((a, b) => a.sequence_order - b.sequence_order);
  const direction = activeTrip?.direction ?? 'MORNING';
  return routeStops.map((stop) => ({
    id: stop.id,
    name: stop.name,
    eta: formatEta(stop, direction),
    lat: stop.lat ?? 0,
    lng: stop.lng ?? 0,
  }));
}

export function useActiveTrip() {
  const { data: todayTrips = [], isLoading } = useGetTodayTripQuery();
  const activeTrip: ShuttleTrip | null = todayTrips.length > 0 ? todayTrips[0] : null;
  const tripId = activeTrip?.id;

  const { stops, currentStop, nextStopAfterCurrent, nextStopIndex, isLastStop, rideStarted, isAtStop } = useMemo(() => {
    const stops = buildStops(activeTrip);
    const started = !!activeTrip?.started_at;
    const stopStatus = activeTrip?.current_stop_status ?? null;

    if (!stops.length) {
      return {
        stops,
        currentStop: null as Stop | null,
        nextStopAfterCurrent: null as Stop | null,
        nextStopIndex: 0,
        isLastStop: false,
        rideStarted: started,
        isAtStop: false,
      };
    }

    const currentStopId = activeTrip?.current_stop_id ?? null;
    const indexOfCurrent = currentStopId == null ? -1 : stops.findIndex((s) => s.id === currentStopId);

    // AT_STOP means the driver is physically at current_stop_id, attendance sheet should be shown.
    // EN_ROUTE or null means the driver is driving to the next stop after current_stop_id.
    const driverIsAtStop = stopStatus === 'AT_STOP';

    let currentStop: Stop | null;
    let nextStopIndex: number;
    let nextStopAfterCurrent: Stop | null;
    let isLastStop: boolean;

    if (driverIsAtStop && indexOfCurrent >= 0) {
      // Show the stop the driver has arrived at
      currentStop = stops[indexOfCurrent] ?? null;
      nextStopIndex = indexOfCurrent;
      isLastStop = indexOfCurrent === stops.length - 1;
      nextStopAfterCurrent =
        indexOfCurrent + 1 < stops.length ? stops[indexOfCurrent + 1] ?? null : null;
    } else {
      // Show the next stop to drive to (original logic)
      const nextIndex = indexOfCurrent + 1;
      nextStopIndex = Math.min(nextIndex, stops.length - 1);
      isLastStop = nextStopIndex === stops.length - 1;
      currentStop = stops[nextStopIndex] ?? null;
      nextStopAfterCurrent =
        nextStopIndex + 1 < stops.length ? stops[nextStopIndex + 1] ?? null : null;
    }

    return {
      stops,
      currentStop,
      nextStopAfterCurrent,
      nextStopIndex,
      isLastStop,
      rideStarted: started,
      isAtStop: driverIsAtStop,
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
    isAtStop,
    isLoading,
  };
}

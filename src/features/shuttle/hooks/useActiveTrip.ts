import { useMemo } from 'react';
import { useGetTodayTripQuery, getCurrentStopId } from '../services/shuttleApi';
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

export type DisplayStop = { id: number; name: string; eta: string; skipped: boolean; isOffice?: boolean };

/** Route Overview display list: navigable stops plus fully-excluded ("skipped") ones,
 * interleaved in their real route order — display-only, never used for navigation/current-stop
 * logic (that stays on `stops` above, which correctly omits skipped stops entirely). */
function buildDisplayStops(activeTrip: ShuttleTrip | null): DisplayStop[] {
  const direction = activeTrip?.direction ?? 'MORNING';
  const routeStopsRaw = activeTrip?.routes?.route_stops ?? [];
  const excludedRaw = activeTrip?.routes?.excluded_stops ?? [];
  const navigable = routeStopsRaw.map((s) => ({
    id: s.id,
    name: s.name,
    eta: formatEta(s, direction),
    skipped: false,
    sequence_order: s.sequence_order,
  }));
  const skipped = excludedRaw.map((s) => ({
    id: s.id,
    name: s.name,
    eta: '—',
    skipped: true,
    sequence_order: s.sequence_order,
  }));
  const rest = [...navigable, ...skipped]
    .sort((a, b) => a.sequence_order - b.sequence_order)
    .map(({ id, name, eta, skipped }) => ({ id, name, eta, skipped }));
  const office = buildOfficeDisplayStop(activeTrip);
  // Office is always evening_sequence = 1 by convention — guaranteed to sort before every
  // real stop — so it's simplest to just prepend it rather than fold it into the sort above.
  return office ? [office, ...rest] : rest;
}

/** The office stop (evening trips only) — never part of `stops`/navigation, but still shown
 * on Route Overview for context so the driver sees where the return trip actually starts. */
function buildOfficeDisplayStop(activeTrip: ShuttleTrip | null): DisplayStop | null {
  const officeRaw = activeTrip?.routes?.office_stop;
  if (!officeRaw) return null;
  const direction = activeTrip?.direction ?? 'MORNING';
  return {
    id: officeRaw.id,
    name: officeRaw.name,
    eta: formatEta(officeRaw, direction),
    skipped: false,
    isOffice: true,
  };
}

export function useActiveTrip(preferredTripId?: number | null) {
  const { data: todayTrips = [], isLoading, isFetching, refetch } = useGetTodayTripQuery();
  const activeTrip: ShuttleTrip | null = (() => {
    if (preferredTripId != null) {
      const matched = todayTrips.find((trip) => trip.id === preferredTripId);
      if (matched) return matched;
    }
    return todayTrips.length > 0 ? todayTrips[0] : null;
  })();
  const tripId = activeTrip?.id;

  const displayStops = useMemo(() => buildDisplayStops(activeTrip), [activeTrip]);
  /** Additive — display-only, for consumers (e.g. Return.tsx's pre-start preview) that
   * need the office entry on its own rather than folded into displayStops. */
  const officeStop = useMemo(() => buildOfficeDisplayStop(activeTrip), [activeTrip]);

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

    const currentStopId = getCurrentStopId(activeTrip);
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
    /** Display-only — see buildDisplayStops. Additive; existing consumers unaffected. */
    displayStops,
    /** Display-only — see buildOfficeDisplayStop. Additive; existing consumers unaffected. */
    officeStop,
    currentStop,
    nextStopAfterCurrent,
    nextStopIndex,
    isLastStop,
    rideStarted,
    isAtStop,
    isLoading,
    /** True during any fetch of getTodayTrip — initial load or a background refetch alike.
     * Additive, like `refetch` below — existing consumers are unaffected unless they opt in. */
    isFetching,
    /** Refetches the underlying getTodayTrip query. Additive — existing consumers of this
     * hook (Return.tsx, RideInProgress.tsx) are unaffected unless they opt in to using it. */
    refetch,
  };
}

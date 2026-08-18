import { baseApi } from '../../../core/api/baseApi';

/** Trip on the employee's route(s) with driver and vehicle (matches backend getTripsForEmployee). */
export type RouteStop = {
  id: number;
  route_id: number;
  name: string;
  sequence_order: number;
  morning_eta: string | null;
  evening_eta: string | null;
  lat: number | null;
  lng: number | null;
  /** PICKUP = home/neighborhood stop, OFFICE = company office stop. A route can have several
   * of either — see the symmetric attendance rule documented alongside my_stop_id below. */
  stop_type: 'PICKUP' | 'OFFICE';
};

export type ShuttleTripForEmployee = {
  id: number;
  route_id: number | null;
  driver_id: string | null;
  trip_date: string | null;
  direction: string;
  status: string | null;
  started_at: string | null;
  completed_at: string | null;
  current_stop_id?: number | null;
  current_stop_status?: 'AT_STOP' | 'EN_ROUTE' | null;
  current_stop_arrived_at?: string | null;
  /** The ID of this employee's designated pickup stop */
  my_pickup_stop_id?: number | null;
  /** Full details of this employee's pickup stop (null if unassigned) */
  my_pickup_stop?: RouteStop | null;
  /** The ID of this employee's assigned office stop — which office they're dropped at
   * (morning) / board from (evening). Null for legacy/pre-backfill assignments or an
   * inbound daily-override (which always targets a pickup-type stop). */
  my_office_stop_id?: number | null;
  /** Direction-aware convenience field: which stop is "mine" for boarding-origin purposes
   * on this leg — my_office_stop_id when direction is EVENING, my_pickup_stop_id otherwise.
   * Use this (not my_pickup_stop_id) for "is the driver at my stop right now" comparisons. */
  my_stop_id?: number | null;
  /** This employee's own boarding/drop-off status on the trip ('BOARDED' | 'DROPPED_OFF' | 'ABSENT' | null).
   * Only populated for currently STARTED/IN_PROGRESS trips — distinct from the trip-level `status`,
   * since an evening trip can still be IN_PROGRESS for other riders after this employee is dropped off. */
  my_boarding_status?: string | null;
  /** True when this employee is currently, effectively marked absent for this trip
   * (derived server-side from shuttle_boarding_logs.status === 'ABSENT'). Populated for
   * all trip statuses, not just active ones — the morning "mark myself absent" toggle
   * needs this while the trip is still SCHEDULED. Self-service is morning-only. */
  my_self_marked_absent?: boolean;
  /** Last-known driver GPS position from Redis (shuttle:last_coord). Only populated for
   * trips currently STARTED/IN_PROGRESS; null otherwise. Seeded at trip start and updated
   * on every live location ping — used as the RideActive marker's initial position before
   * the first driver:location socket event of the session arrives. */
  last_lat?: number | null;
  last_lng?: number | null;
  last_location_ts?: number | null;
  routes: {
    id: number;
    name: string;
    vehicles: {
      id: number;
      plate_number: string;
      make: string;
      model: string;
    } | null;
    route_stops?: RouteStop[];
  } | null;
  users: {
    id: string;
    full_name: string | null;
    phone: string | null;
    profile_picture_url: string | null;
  } | null;
};

export type GetShuttleTripsForEmployeeParams = {
  companyId: number;
  employeeId: string;
  /** Optional page number (1-based). When omitted the server returns all trips. */
  page?: number;
  /** Optional page size. When omitted the server returns all trips. */
  limit?: number;
  /** When true, restricts results to the latest available trip date at or after today
   * (not strictly the current calendar day) — used by the home screen so past trips
   * aren't shown, while a trip the nightly cron already created for tomorrow still
   * shows immediately instead of waiting for the calendar day to turn over. */
  todayOnly?: boolean;
};

export type ShuttleTripsForEmployeePagination = {
  page: number;
  pages: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type PolylinePoint = { lat: number; lng: number };

export type ShuttlePolylineResponse = {
  points: PolylinePoint[];
  encodedPolyline: string;
};

export type GetShuttlePolylineParams = {
  tripId: number;
  driverLat?: number;
  driverLng?: number;
};

export const employeeShuttleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getShuttleTripsForEmployee: builder.query<
      ShuttleTripForEmployee[],
      GetShuttleTripsForEmployeeParams
    >({
      query: ({ companyId, employeeId, page, limit, todayOnly }) => ({
        url: '/shuttle-trips/for-employee',
        params: {
          company_id: companyId,
          employee_id: employeeId,
          ...(page != null ? { page } : {}),
          ...(limit != null ? { limit } : {}),
          ...(todayOnly ? { today_only: true } : {}),
        },
      }),
      // Backend now always returns { data: [...], pagination: {...} }
      // Unwrap so consumers still receive ShuttleTripForEmployee[] directly.
      transformResponse: (response: { data: ShuttleTripForEmployee[]; pagination: ShuttleTripsForEmployeePagination }) =>
        response.data,
      providesTags: ['ShuttleTrip'],
    }),

    getShuttlePolyline: builder.query<ShuttlePolylineResponse, GetShuttlePolylineParams>({
      query: ({ tripId, driverLat, driverLng }) => ({
        url: `/shuttle-trips/${tripId}/polyline`,
        params: {
          ...(driverLat !== undefined ? { driverLat } : {}),
          ...(driverLng !== undefined ? { driverLng } : {}),
        },
      }),
      providesTags: (_result, _error, { tripId }) => [{ type: 'ShuttlePolyline', id: tripId }],
    }),
  }),
});

export const {
  useGetShuttleTripsForEmployeeQuery,
  useGetShuttlePolylineQuery,
} = employeeShuttleApi;

/**
 * Picks the trip the morning attendance toggle should act on. Deliberately distinct from
 * a generic "first non-completed trip" picker (which could return an EVENING trip) — self
 * service attendance is morning-only. Keeps STARTED/IN_PROGRESS in scope (not just
 * SCHEDULED) so the toggle stays visible-but-locked once the ride starts, rather than
 * disappearing.
 */
export function selectMorningAttendanceTrip(
  trips: ShuttleTripForEmployee[] | undefined,
): ShuttleTripForEmployee | null {
  if (!trips) return null;
  return (
    trips.find(
      (t) =>
        t.direction === 'MORNING' &&
        (t.status === 'SCHEDULED' || t.status === 'STARTED' || t.status === 'IN_PROGRESS'),
    ) ?? null
  );
}

import { baseApi } from '../../../core/api/baseApi';

/** Real route_stops ids never reach this range (a Postgres serial) — used to tell a synthetic
 *  daily-override stop id apart from a real one. Must match OVERRIDE_STOP_ID_OFFSET in
 *  cort-backend's shuttle-trips.service.ts. */
export const OVERRIDE_STOP_ID_OFFSET = 2_000_000_000;

type RouteStop = {
  id: number;
  route_id: number;
  name: string;
  sequence_order: number;
  /**
   * Time strings in HH:MM format (from Postgres TO_CHAR) or null.
   */
  morning_eta: string | null;
  evening_eta: string | null;
  lat: number | null;
  lng: number | null;
  /** True for a synthetic stop backed by a same-day route override, not a real route_stops row. */
  is_override?: boolean;
  /** PICKUP = home/neighborhood stop, OFFICE = company office stop. A route can have several
   * of either. Drives whether attendance UI is required at this stop for a given trip
   * direction — see the symmetric rule documented in useActiveTrip.ts / RideInProgress.tsx. */
  stop_type: 'PICKUP' | 'OFFICE';
};

type RouteCount = {
  employee_route_assignments: number;
};

type Vehicle = {
  id: number;
  plate_number: string;
  make?: string | null;
  model: string | null;
  color?: string | null;
};

/** Display label like "Black Hiace" or "Toyota Hiace". */
export function formatShuttleVehicleLabel(vehicle?: Vehicle | null): string {
  if (!vehicle) return '—';
  const model = vehicle.model?.trim() || '';
  const color = vehicle.color?.trim() || '';
  const make = vehicle.make?.trim() || '';
  if (color && model) return `${color} ${model}`;
  if (make && model) return `${make} ${model}`;
  return model || make || color || '—';
}

export function formatShuttleVehiclePlate(vehicle?: Vehicle | null): string {
  return vehicle?.plate_number?.trim() || '—';
}

type Route = {
  id: number;
  name: string;
  /** PKT HH:MM — evening return trips cannot start before this time */
  evening_lock_time?: string | null;
  route_stops: RouteStop[];
  /** Stops fully excluded from route_stops above (every assigned employee absent) —
   * surfaced separately, with their original sequence, so the driver's Route Overview
   * can still show them (struck through, labeled "Skipped") instead of them silently
   * disappearing. Works for both directions; empty/absent when nothing's excluded. */
  excluded_stops?: { id: number; name: string; sequence_order: number }[];
  /** The office stop (evening trips only) — excluded from route_stops/excluded_stops
   * above since it's the return trip's starting point, not a navigation target or an
   * absence-skip, but still surfaced here so Route Overview can show it for context. */
  office_stop?: { id: number; name: string; morning_eta: string | null; evening_eta: string | null } | null;
  _count?: RouteCount;
  vehicles?: Vehicle | null;
};

export type ShuttleTrip = {
  id: number;
  route_id: number | null;
  direction: 'MORNING' | 'EVENING';
  status: string;
  started_at?: string | null;
  completed_at?: string | null;
  current_stop_id?: number | null;
  /** Set instead of current_stop_id when the driver is at a daily-override stop (current_stop_id
   *  is FK'd to route_stops, which an override stop is not a row of). At most one of the two
   *  is ever set. Resolve via getCurrentStopId() below rather than reading either field directly. */
  current_override_stop_id?: number | null;
  current_stop_arrived_at?: string | null;
  current_stop_status?: 'AT_STOP' | 'EN_ROUTE' | null;
  routes?: Route | null;
};

/** Resolves the trip's current stop id in the same id-space `routes.route_stops[]` uses —
 *  real stops keep their id, an override stop is OVERRIDE_STOP_ID_OFFSET + current_override_stop_id. */
export function getCurrentStopId(trip: Pick<ShuttleTrip, 'current_stop_id' | 'current_override_stop_id'> | null | undefined): number | null {
  if (!trip) return null;
  if (trip.current_stop_id != null) return trip.current_stop_id;
  if (trip.current_override_stop_id != null) return OVERRIDE_STOP_ID_OFFSET + trip.current_override_stop_id;
  return null;
}

/** startTrip's response — extends ShuttleTrip with the exclusion-aware navigation target,
 * resolved synchronously server-side (DB-only, no Google Directions call) so the client can
 * navigate correctly without a race against a background cache refetch. `excluded_stops`
 * carries names (not just ids) so the UI can tell the driver *why* Maps is pointing somewhere
 * other than the route's usual first stop, before handing off to external navigation. */
export type StartTripResponse = ShuttleTrip & {
  first_stop: { id: number; name: string; lat: number; lng: number } | null;
  excluded_stops: { id: number; name: string }[];
};

// Frontend-friendly shape for employees on a trip.
export type TripEmployee = {
  id: string; // user id
  fullName: string;
  phone: string | null;
  department: string | null;
  pickupStopId: number | null;
  pickupStopName: string | null;
  pickupStopOrder: number | null;
  /** Which office stop this employee is dropped at (morning) / boards from (evening) —
   * null for legacy/pre-backfill assignments, in which case callers should fall back to
   * treating the employee as belonging to the route's first/only office stop. */
  officeStopId: number | null;
};

type TodayTripsWrappedResponse = {
  data: ShuttleTrip[] | null;
};

export type TripAttendance = {
  employeeId: string;
  fullName: string;
  phone: string | null;
  department: string | null;
  status: string | null;
  scannedAt: string | null;
  /** Who last wrote this attendance row — 'EMPLOYEE' when self-reported (e.g. the
   * morning "mark myself absent" flow), 'DRIVER' when marked from this screen. */
  source?: 'EMPLOYEE' | 'DRIVER' | null;
};

export const shuttleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTodayTrip: builder.query<ShuttleTrip[], void>({
      // Send driver's local date so "today" is the calendar day they see (fixes timezone bug when UTC date differs).
      query: () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const date = `${y}-${m}-${d}`;
        return `/shuttle-trips/today?date=${date}`;
      },
      // Backend commonly wraps responses as { data: ... }, but in case
      // this endpoint returns the raw entity we defensively support both.
      transformResponse: (
        response: TodayTripsWrappedResponse | ShuttleTrip[] | ShuttleTrip | null,
      ) => {
        // Wrapped as { data: [...] }
        if (response && typeof (response as any).data !== 'undefined') {
          const wrapped = response as TodayTripsWrappedResponse;
          return wrapped.data ?? [];
        }

        // Raw array
        if (Array.isArray(response)) {
          return response as ShuttleTrip[];
        }

        // Single trip (legacy shape) or null – normalize to array
        if (response) {
          return [response as ShuttleTrip];
        }

        return [];
      },
      providesTags: ['ShuttleTrip'],
    }),
    getTripEmployees: builder.query<TripEmployee[], number>({
      query: (tripId) => `/shuttle-trips/${tripId}/employees`,
      transformResponse: (
        response:
          | { data?: any[] }
          | any[]
          | null,
      ) => {
        const rawRows: any[] =
          !response
            ? []
            : Array.isArray(response)
              ? response
              : Array.isArray(response.data)
                ? response.data
                : [];

        return rawRows.map((row) => {
          const user = row.users ?? {};
          const stop = row.route_stops ?? {};
          const OVERRIDE_STOP_ID_OFFSET = 2_000_000_000;
          const rawPickup = row.pickup_stop_id ?? null;
          const pickupStopId =
            rawPickup != null && rawPickup >= OVERRIDE_STOP_ID_OFFSET
              ? rawPickup
              : row.is_override && row.override?.id
                ? OVERRIDE_STOP_ID_OFFSET + row.override.id
                : rawPickup;
          return {
            id: user.id ?? row.user_id,
            fullName: user.full_name ?? '',
            phone: user.phone ?? null,
            department: user.department ?? null,
            pickupStopId,
            pickupStopName: stop.name ?? row.stop_name ?? null,
            pickupStopOrder:
              typeof stop.sequence_order === 'number' ? stop.sequence_order : null,
            officeStopId: row.office_stop_id ?? null,
          } as TripEmployee;
        });
      },
      // Uses no cache tags in the global tagTypes; cached by RTKQ per-arg.
    }),
    getTripAttendance: builder.query<TripAttendance[], number>({
      query: (tripId) => `/shuttle-boarding-logs/manifest/${tripId}`,
      transformResponse: (
        response:
          | { data?: any[] }
          | any[]
          | null,
      ) => {
        const rawRows: any[] =
          !response
            ? []
            : Array.isArray(response)
              ? response
              : Array.isArray(response.data)
                ? response.data
                : [];

        return rawRows.map((row) => {
          const user = row.users ?? {};
          return {
            employeeId: row.employee_id ?? '',
            fullName: user.full_name ?? '',
            phone: user.phone ?? null,
            department: user.department ?? null,
            status: row.status ?? null,
            scannedAt: row.scanned_at ?? null,
            source: row.source ?? null,
          } as TripAttendance;
        });
      },
      providesTags: (result, error, tripId) => [
        { type: 'Attendance', id: tripId },
      ],
    }),
    scanPassenger: builder.mutation<
      { employee_id?: string; status?: string | null },
      { shuttleTripId: number; employeeId: string; status?: string }
    >({
      query: ({ shuttleTripId, employeeId, status }) => ({
        url: '/shuttle-boarding-logs/scan',
        method: 'POST',
        body: {
          shuttle_trip_id: shuttleTripId,
          employee_id: employeeId,
          ...(status ? { status } : {}),
        },
      }),
      // route_stops (and its baked-in "skip this stop if everyone assigned is absent"
      // exclusion, computed server-side) lives on getTodayTrip, tagged 'ShuttleTrip' — a
      // present/absent change can flip whether a later stop should still be navigated to,
      // so the trip must be refetched here too, not just the attendance sub-cache below.
      invalidatesTags: (result, error) => (error ? [] : ['ShuttleTrip']),
      async onQueryStarted(
        { shuttleTripId, employeeId },
        { dispatch, queryFulfilled },
      ) {
        try {
          const { data } = await queryFulfilled;
          const status = data?.status ?? 'PRESENT';
          dispatch(
            shuttleApi.util.updateQueryData(
              'getTripAttendance',
              shuttleTripId,
              (draft) => {
                const i = draft.findIndex((e) => e.employeeId === employeeId);
                if (i !== -1) {
                  draft[i].status = status;
                  draft[i].source = 'DRIVER';
                } else
                  draft.push({
                    employeeId,
                    fullName: '',
                    phone: null,
                    department: null,
                    status,
                    scannedAt: null,
                    source: 'DRIVER',
                  });
              },
            ),
          );
        } catch {
          // Cache not patched on failure; UI stays as-is.
        }
      },
    }),
    markPassengerAbsent: builder.mutation<
      { employee_id?: string; status?: string | null },
      { shuttleTripId: number; employeeId: string }
    >({
      query: ({ shuttleTripId, employeeId }) => ({
        url: '/shuttle-boarding-logs/mark-absent',
        method: 'POST',
        body: {
          shuttle_trip_id: shuttleTripId,
          employee_id: employeeId,
        },
      }),
      // Same reasoning as scanPassenger above — marking someone absent can newly empty
      // out a later stop, which only getTodayTrip's route_stops/excluded_stops reflects.
      invalidatesTags: (result, error) => (error ? [] : ['ShuttleTrip']),
      async onQueryStarted(
        { shuttleTripId, employeeId },
        { dispatch, queryFulfilled },
      ) {
        try {
          const { data } = await queryFulfilled;
          const status = data?.status ?? 'ABSENT';
          dispatch(
            shuttleApi.util.updateQueryData(
              'getTripAttendance',
              shuttleTripId,
              (draft) => {
                const i = draft.findIndex((e) => e.employeeId === employeeId);
                if (i !== -1) {
                  draft[i].status = status;
                  draft[i].source = 'DRIVER';
                } else
                  draft.push({
                    employeeId,
                    fullName: '',
                    phone: null,
                    department: null,
                    status,
                    scannedAt: null,
                    source: 'DRIVER',
                  });
              },
            ),
          );
        } catch {
          // Cache not patched on failure; UI stays as-is.
        }
      },
    }),
    startTrip: builder.mutation<
      StartTripResponse,
      { route_id: number; direction: 'MORNING' | 'EVENING'; lat?: number; lng?: number }
    >({
      query: ({ route_id, direction, lat, lng }) => {
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        return {
          url: '/shuttle-trips/start',
          method: 'POST',
          body: {
            route_id,
            direction,
            date,
            ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
          },
        };
      },
      async onQueryStarted(
        _arg,
        { dispatch, queryFulfilled },
      ) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            shuttleApi.util.updateQueryData('getTodayTrip', undefined, (draft) => {
              const i = draft.findIndex((t) => t.id === data.id);
              if (i >= 0) {
                draft[i].started_at = data.started_at ?? draft[i].started_at;
                draft[i].status = data.status ?? draft[i].status;
                if (data.route_id != null) draft[i].route_id = data.route_id;
                if (data.direction != null) draft[i].direction = data.direction;
                // Deliberately NOT patching route_stops/excluded_stops here: this response only
                // tells us the *first* navigable stop and which stops are currently excluded —
                // not the full unfiltered stop list — so there's no way to correctly restore a
                // stop that an earlier (now-stale) exclusion had removed (e.g. someone marked
                // absent, then undid it before start). A partial patch can only ever remove
                // stops, never add them back, which is exactly how this went stale. The caller
                // (RideInProgress.tsx) triggers a full refetch of this query right after start,
                // which recomputes both fields correctly from scratch.
              } else {
                draft.unshift(data as ShuttleTrip);
              }
            }),
          );
        } catch {
          // Cache not patched on failure
        }
      },
    }),
    submitReturnAttendance: builder.mutation<
      unknown,
      {
        shuttleTripId: number;
        entries: Array<{
          employee_id: string;
          status: 'PRESENT' | 'ABSENT';
          absent_reason?: string;
        }>;
      }
    >({
      query: ({ shuttleTripId, entries }) => ({
        url: '/shuttle-boarding-logs/bulk-attendance',
        method: 'POST',
        body: {
          shuttle_trip_id: shuttleTripId,
          entries,
        },
      }),
      // route_stops/excluded_stops on getTodayTrip (tagged 'ShuttleTrip') bakes in the
      // "skip this stop if everyone assigned is absent" exclusion, computed server-side,
      // and does need to be refreshed after this call — but NOT via automatic tag
      // invalidation here. Every caller of this mutation (Return.tsx) immediately follows
      // it with a second write (startTrip, or proceedFromStop) that changes trip state
      // further; an auto-triggered background refetch fired the instant THIS mutation
      // resolves can still be in flight when that second write's own optimistic patch
      // lands, and land after it — silently reverting the newer, correct state back to
      // stale data (e.g. current_stop_status flipping back to AT_STOP after
      // proceedFromStop already moved it to EN_ROUTE). Each caller instead explicitly
      // calls refetchActiveTrip() once, after its full write sequence completes.
      invalidatesTags: (result, error, { shuttleTripId }) =>
        error ? [] : [{ type: 'Attendance', id: shuttleTripId }],
    }),
    arriveAtStop: builder.mutation<
      ShuttleTrip,
      { tripId: number; current_stop_id: number }
    >({
      query: ({ tripId, current_stop_id }) => ({
        url: `/shuttle-trips/${tripId}/arrive-at-stop`,
        method: 'POST',
        body: { current_stop_id },
      }),
      async onQueryStarted(
        { tripId, current_stop_id },
        { dispatch, queryFulfilled },
      ) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            shuttleApi.util.updateQueryData('getTodayTrip', undefined, (draft) => {
              const trip = draft.find((t) => t.id === tripId);
              if (trip) {
                // Assign directly, not `?? trip.current_stop_id` — arriving at an override
                // stop returns current_stop_id: null (it lives in current_override_stop_id
                // instead), and the fallback would otherwise keep showing the old stop.
                trip.current_stop_id = data.current_stop_id ?? null;
                trip.current_override_stop_id = data.current_override_stop_id ?? null;
                trip.current_stop_arrived_at =
                  data.current_stop_arrived_at ?? trip.current_stop_arrived_at;
                trip.current_stop_status = 'AT_STOP';
              }
            }),
          );
        } catch {
          // Cache not patched on failure
        }
      },
    }),
    proceedFromStop: builder.mutation<
      ShuttleTrip,
      { tripId: number }
    >({
      query: ({ tripId }) => ({
        url: `/shuttle-trips/${tripId}/proceed-stop`,
        method: 'PATCH',
      }),
      async onQueryStarted(
        { tripId },
        { dispatch, queryFulfilled },
      ) {
        // Only patch cache after a successful 200 — never optimistic.
        try {
          const { data } = await queryFulfilled;
          dispatch(
            shuttleApi.util.updateQueryData('getTodayTrip', undefined, (draft) => {
              const trip = draft.find((t) => t.id === tripId);
              if (trip) {
                trip.current_stop_status =
                  data.current_stop_status ?? 'EN_ROUTE';
                if (data.current_stop_id != null) {
                  trip.current_stop_id = data.current_stop_id;
                }
              }
            }),
          );
        } catch {
          // Cache not patched on failure
        }
      },
    }),
    completeTrip: builder.mutation<
      ShuttleTrip,
      { tripId: number; total_distance?: number; end_time?: string; lat?: number; lng?: number }
    >({
      query: ({ tripId, total_distance = 0, end_time, lat, lng }) => ({
        url: `/shuttle-trips/${tripId}/complete`,
        method: 'POST',
        body: {
          total_distance,
          ...(end_time ? { end_time } : {}),
          ...(lat != null && lng != null ? { lat, lng } : {}),
        },
        // Complete does straggler drop-offs + Redis reads + polyline encoding;
        // the default 20s can be too tight on a loaded server or slow connection.
        timeout: 45000,
      }),
      invalidatesTags: ['ShuttleTrip'],
      async onQueryStarted(
        { tripId },
        { dispatch, queryFulfilled },
      ) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            shuttleApi.util.updateQueryData('getTodayTrip', undefined, (draft) => {
              const trip = draft.find((t) => t.id === tripId);
              if (trip) {
                trip.status = data.status ?? trip.status;
                trip.completed_at = data.completed_at ?? trip.completed_at;
              }
            }),
          );
        } catch {
          // Cache not patched on failure
        }
      },
    }),
  }),
});

export const {
  useGetTodayTripQuery,
  useGetTripEmployeesQuery,
  useLazyGetTripEmployeesQuery,
  useGetTripAttendanceQuery,
  useScanPassengerMutation,
  useMarkPassengerAbsentMutation,
  useSubmitReturnAttendanceMutation,
  useStartTripMutation,
  useArriveAtStopMutation,
  useProceedFromStopMutation,
  useCompleteTripMutation,
} = shuttleApi;


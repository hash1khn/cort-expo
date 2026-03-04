import { baseApi } from '../../../core/api/baseApi';

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
};

type RouteCount = {
  employee_route_assignments: number;
};

type Vehicle = {
  id: number;
  plate_number: string;
  model: string | null;
};

type Route = {
  id: number;
  name: string;
  route_stops: RouteStop[];
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
  current_stop_arrived_at?: string | null;
  routes?: Route | null;
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
          return {
            id: user.id ?? row.user_id,
            fullName: user.full_name ?? '',
            phone: user.phone ?? null,
            department: user.department ?? null,
            pickupStopId: row.pickup_stop_id ?? null,
            pickupStopName: stop.name ?? null,
            pickupStopOrder:
              typeof stop.sequence_order === 'number' ? stop.sequence_order : null,
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
                if (i !== -1) draft[i].status = status;
                else
                  draft.push({
                    employeeId,
                    fullName: '',
                    phone: null,
                    department: null,
                    status,
                    scannedAt: null,
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
                if (i !== -1) draft[i].status = status;
                else
                  draft.push({
                    employeeId,
                    fullName: '',
                    phone: null,
                    department: null,
                    status,
                    scannedAt: null,
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
      ShuttleTrip,
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
                // Leave draft[i].routes unchanged so route_stops from getTodayTrips are preserved
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
                trip.current_stop_id = data.current_stop_id ?? trip.current_stop_id;
                trip.current_stop_arrived_at =
                  data.current_stop_arrived_at ?? trip.current_stop_arrived_at;
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
      { tripId: number; total_distance?: number; end_time?: string }
    >({
      query: ({ tripId, total_distance = 0, end_time }) => ({
        url: `/shuttle-trips/${tripId}/complete`,
        method: 'POST',
        body: { total_distance, ...(end_time ? { end_time } : {}) },
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
  useCompleteTripMutation,
} = shuttleApi;


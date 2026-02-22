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
      query: () => '/shuttle-trips/today',
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
      unknown,
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
      invalidatesTags: (result, error, { shuttleTripId }) => [
        { type: 'Attendance', id: shuttleTripId },
      ],
    }),
    markPassengerAbsent: builder.mutation<
      unknown,
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
      invalidatesTags: (result, error, { shuttleTripId }) => [
        { type: 'Attendance', id: shuttleTripId },
      ],
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
} = shuttleApi;


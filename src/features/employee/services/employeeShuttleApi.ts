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
  } | null;
};

export type GetShuttleTripsForEmployeeParams = {
  companyId: number;
  employeeId: string;
  /** Optional page number (1-based). When omitted the server returns all trips. */
  page?: number;
  /** Optional page size. When omitted the server returns all trips. */
  limit?: number;
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
      query: ({ companyId, employeeId, page, limit }) => ({
        url: '/shuttle-trips/for-employee',
        params: {
          company_id: companyId,
          employee_id: employeeId,
          ...(page != null ? { page } : {}),
          ...(limit != null ? { limit } : {}),
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
    }),
  }),
});

export const {
  useGetShuttleTripsForEmployeeQuery,
  useGetShuttlePolylineQuery,
} = employeeShuttleApi;

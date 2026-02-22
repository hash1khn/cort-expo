import { baseApi } from '../../../core/api/baseApi';

/** Trip on the employee's route(s) with driver and vehicle (matches backend getTripsForEmployee). */
export type ShuttleTripForEmployee = {
  id: number;
  route_id: number | null;
  driver_id: string | null;
  trip_date: string | null;
  direction: string;
  status: string | null;
  started_at: string | null;
  completed_at: string | null;
  routes: {
    id: number;
    name: string;
    vehicles: {
      id: number;
      plate_number: string;
      make: string;
      model: string;
    } | null;
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
};

export const employeeShuttleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getShuttleTripsForEmployee: builder.query<
      ShuttleTripForEmployee[],
      GetShuttleTripsForEmployeeParams
    >({
      query: ({ companyId, employeeId }) => ({
        url: '/shuttle-trips/for-employee',
        params: { company_id: companyId, employee_id: employeeId },
      }),
      providesTags: ['ShuttleTrip'],
    }),
  }),
});

export const { useGetShuttleTripsForEmployeeQuery } = employeeShuttleApi;

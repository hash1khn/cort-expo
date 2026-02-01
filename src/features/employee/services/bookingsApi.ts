import { baseApi } from '../../../core/api/baseApi';

type ChauffeurBooking = {
  id: number;
  company_id: number;
  passenger_id: string;
  vehicle_model: string;
  booking_type: string;
  package_selected: string;
  trip_type: string;
  pickup_address?: string;
  destination_cities?: string[];
  scheduled_for?: string;
  status: string;
  created_at: string;
  companies?: {
    id: number;
    name: string;
    logo_url?: string;
  };
  users_chauffeur_bookings_passenger_idTousers?: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };
  users_chauffeur_bookings_driver_idTousers?: {
    id: string;
    full_name: string;
    phone: string;
  };
  vehicles?: {
    id: number;
    plate_number: string;
    make: string;
    model: string;
    year: number;
    color: string;
    category: string;
  };
};

// Shape of the *inner* data object returned by the backend
// raw backend: { data: { data: ChauffeurBooking[]; pagination: {...} }, message, status }
// we transformResponse to return only the inner { data, pagination }
type ChauffeurBookingsResponse = {
  data: ChauffeurBooking[];
  pagination: {
    page: number;
    pages: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

type GetChauffeurBookingsParams = {
  companyId: number;
  employeeId: string;
  page?: number;
  limit?: number;
  status?: string;
};

export const bookingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getChauffeurBookings: builder.query<ChauffeurBookingsResponse, GetChauffeurBookingsParams>({
      query: ({ companyId, employeeId, page = 1, limit = 10, status }) => {
        const params = new URLSearchParams({
          passenger_id: employeeId,
          page: page.toString(),
          limit: limit.toString(),
        });
        if (status) {
          params.append('status', status);
        }
        return `/companies/${companyId}/chauffeur-bookings?${params.toString()}`;
      },
      // Unwrap the inner `data` object so hooks see { data, pagination }
      transformResponse: (response: { data: ChauffeurBookingsResponse }) => response.data,
      providesTags: ['ChauffeurBooking'],
    }),
  }),
});

export const { useGetChauffeurBookingsQuery } = bookingsApi;

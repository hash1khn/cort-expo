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

/** Shape returned by GET /employee/companies/:companyId/chauffeur-bookings/active */
export type EmployeeActiveChauffeurBooking = {
  id: number;
  status: string;
  trip_type: 'IN_CITY' | 'OUT_STATION';
  no_of_days: number;
  package_selected: string;
  pickup_address: string | null;
  destination_cities: string[];
  scheduled_for: string | null;
  companies: { id: number; name: string; logo_url: string | null } | null;
  /** Driver details */
  users_chauffeur_bookings_driver_idTousers: {
    id: string;
    full_name: string;
    phone: string | null;
  } | null;
  vehicles: {
    id: number;
    plate_number: string;
    make: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    category: string | null;
  } | null;
  chauffeur_trip_logs: {
    start_time: string | null;
    end_time: string | null;
    total_distance_km: string | null;
    total_duration_minutes: number | null;
    expense_toll: string | null;
    expense_parking: string | null;
    total_invoice_amount: string | null;
    payment_status: string | null;
  } | null;
  chauffeur_trip_daily_logs: Array<{
    id: number;
    log_date: string;
    status: string;
    is_requested: boolean;
    is_full_day: boolean;
    start_time: string | null;
    end_time: string | null;
    pickup_time: string | null;
    dropoff_time: string | null;
    pickup_location: string | null;
    dropoff_location: string | null;
  }>;
  /** Computed fields from backend */
  today_log: {
    id: number;
    status: string;
    is_requested: boolean;
    pickup_location: string | null;
  } | null;
  can_request_driver: boolean;
  driver_requested: boolean;
  completed_days: number;
  total_days: number;
  /** null = not yet reviewed; non-null = review already submitted */
  ride_reviews: { id: number; rating: number; review_text: string | null } | null;
};

type GetEmployeeActiveChauffeurBookingParams = {
  companyId: number;
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

    /**
     * GET /employee/companies/:companyId/chauffeur-bookings/active
     *
     * The single most important endpoint for the employee chauffeur flow.
     * Returns the employee's current active booking enriched with:
     *   - today_log: the driver's current step
     *   - can_request_driver / driver_requested: for multi-day request button
     *   - completed_days / total_days: progress indicator
     *
     * Returns null (200) when no active booking exists.
     */
    getEmployeeActiveChauffeurBooking: builder.query<
      EmployeeActiveChauffeurBooking | null,
      GetEmployeeActiveChauffeurBookingParams
    >({
      query: ({ companyId }) =>
        `/employee/companies/${companyId}/chauffeur-bookings/active`,
      transformResponse: (response: { data: EmployeeActiveChauffeurBooking | null }) =>
        response.data ?? null,
      providesTags: ['ChauffeurBooking'],
    }),

    requestNextDayPickup: builder.mutation<
      any,
      { companyId: number; bookingId: number; pickup_location: string }
    >({
      query: ({ companyId, bookingId, pickup_location }) => ({
        url: `/employee/companies/${companyId}/chauffeur-bookings/${bookingId}/request-driver`,
        method: 'POST',
        body: { pickup_location },
      }),
      // Use optimistic update instead of invalidation to prevent skeleton loader
      async onQueryStarted({ companyId, bookingId, pickup_location }, { dispatch, queryFulfilled }) {
        // Optimistically update the cache
        const patchResult = dispatch(
          bookingsApi.util.updateQueryData(
            'getEmployeeActiveChauffeurBooking',
            { companyId },
            (draft) => {
              if (draft) {
                // Mark as driver requested
                draft.driver_requested = true;
                draft.can_request_driver = false;
                // Update today_log if it exists
                if (draft.today_log) {
                  draft.today_log.is_requested = true;
                  draft.today_log.pickup_location = pickup_location;
                }
                // Update the corresponding daily log
                const dailyLog = draft.chauffeur_trip_daily_logs?.find(
                  (log) => log.id === draft.today_log?.id
                );
                if (dailyLog) {
                  dailyLog.is_requested = true;
                  dailyLog.pickup_location = pickup_location;
                }
              }
            }
          )
        );

        try {
          await queryFulfilled;
        } catch {
          // Revert optimistic update on error
          patchResult.undo();
        }
      },
    }),

    getChauffeurRoutePolyline: builder.query<
      { booking_id: number; encoded_polyline: string | null; points: { lat: number; lng: number }[] | null },
      { companyId: number; bookingId: number }
    >({
      query: ({ companyId, bookingId }) =>
        `/employee/companies/${companyId}/chauffeur-bookings/${bookingId}/route-polyline`,
      transformResponse: (response: {
        data: {
          booking_id: number;
          encoded_polyline: string | null;
          points: { lat: number; lng: number }[] | null;
        };
      }) => response.data,
    }),

    submitChauffeurReview: builder.mutation<
      { id: number; rating: number; review_text: string | null },
      { companyId: number; bookingId: number; rating: number; review_text?: string }
    >({
      query: ({ companyId, bookingId, rating, review_text }) => ({
        url: `/employee/companies/${companyId}/chauffeur-bookings/${bookingId}/review`,
        method: 'POST',
        body: { rating, ...(review_text ? { review_text } : {}) },
      }),
      // Optimistic update: mark as reviewed immediately so the sheet doesn't re-appear on re-mount
      async onQueryStarted({ companyId, rating, review_text }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          bookingsApi.util.updateQueryData('getEmployeeActiveChauffeurBooking', { companyId }, (draft) => {
            if (draft) {
              draft.ride_reviews = { id: 0, rating, review_text: review_text ?? null };
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
  }),
});

export const {
  useGetChauffeurBookingsQuery,
  useGetEmployeeActiveChauffeurBookingQuery,
  useRequestNextDayPickupMutation,
  useSubmitChauffeurReviewMutation,
  useGetChauffeurRoutePolylineQuery,
} = bookingsApi;


import { baseApi } from '../../../core/api/baseApi';

// ─── Types matching the backend response ────────────────────────────────────

export type TripStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'OTW'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'DROPPED_OFF'
  | 'ENDED'
  | 'COMPLETED'
  | 'CANCELLED';

export type DailyLogStatus =
  | 'STARTED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'DROPPED_OFF'
  | 'COMPLETED';

export type TripType = 'IN_CITY' | 'OUT_STATION';

export type ChauffeurDailyLog = {
  id: number;
  booking_id: number;
  log_date: string; // ISO date string, e.g. "2026-03-12"
  trip_type: TripType;
  status: DailyLogStatus;
  is_requested: boolean;
  is_full_day: boolean;
  start_time: string | null;
  end_time: string | null;
  pickup_time: string | null;
  dropoff_time: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  distance_km: string | null;
  hours_used: string | null;
};

export type ActiveBooking = {
  id: number;
  status: TripStatus;
  trip_type: TripType;
  package_selected: string;
  no_of_days: number;
  scheduled_for: string | null;
  pickup_address: string | null;
  destination_cities: string[];
  companies: {
    id: number;
    name: string;
    logo_url: string | null;
  } | null;
  /** The passenger (the person being chauffeured) */
  users_chauffeur_bookings_passenger_idTousers: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
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
  chauffeur_trip_daily_logs: ChauffeurDailyLog[];
};

export type EndDailyTripDto = {
  end_time?: string;
  distance_km?: number;
  meter_reading_end?: number;
  meter_reading_end_image_url?: string;
  expense_toll?: number;
  expense_parking?: number;
  expense_toll_image_url?: string;
  expense_parking_image_url?: string;
  force_complete?: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the most recently active daily log — the one the driver is currently working on.
 * This is the log whose status is NOT yet COMPLETED. We avoid matching by date because
 * chauffeurs can work across midnight (log_date = service date, not necessarily today).
 */
export function getActiveLog(logs: ChauffeurDailyLog[]): ChauffeurDailyLog | null {
  if (!logs.length) return null;
  // Find the latest log that's still in-progress (not done).
  // Sort descending by date, and then by id as a fallback for identical dates.
  const activeLog = [...logs]
    .sort((a, b) => {
      const dateDiff = new Date(b.log_date).getTime() - new Date(a.log_date).getTime();
      return dateDiff !== 0 ? dateDiff : b.id - a.id;
    })
    .find((l) => l.status !== 'COMPLETED');
  return activeLog ?? null;
}

/**
 * True when the trip has no daily logs at all, meaning the driver has never
 * tapped "Start Trip" for the very first day.
 */
export function isFirstDayNotStarted(booking: ActiveBooking): boolean {
  return booking.chauffeur_trip_daily_logs.length === 0;
}

/**
 * True when this is a multi-day trip that is between days —
 * i.e., yesterday is COMPLETED but no todayLog exists and is_requested=false
 * on the next pending log. The employee must tap "Request Driver" to kick off the next day.
 */
export function isBetweenDays(booking: ActiveBooking): boolean {
  const activeLog = getActiveLog(booking.chauffeur_trip_daily_logs);
  
  // If the active log exists but wasn't requested or started yet, we are between days.
  if (activeLog) {
    return !activeLog.is_requested && !activeLog.start_time;
  }

  const completedCount = booking.chauffeur_trip_daily_logs.filter(
    (l) => l.status === 'COMPLETED',
  ).length;

  const totalDays = booking.no_of_days ?? 1;

  // If there are completed days and we are not on the last day, we are between days.
  return completedCount > 0 && completedCount < totalDays;
}

// ─── RTKQ API ────────────────────────────────────────────────────────────────

export const chauffeurApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * GET /driver/bookings/active
     * Returns the currently active booking for the authenticated driver,
     * or null if none exists.
     */
    getDriverActiveBooking: builder.query<ActiveBooking | null, void>({
      query: () => '/driver/bookings/active',
      transformResponse: (response: { data?: ActiveBooking | null } | ActiveBooking | null) => {
        // Handle the { data: ... } envelope pattern used across the codebase
        if (response && typeof (response as any).data !== 'undefined') {
          return (response as { data: ActiveBooking | null }).data ?? null;
        }
        return response as ActiveBooking | null;
      },
      providesTags: ['ChauffeurBooking'],
    }),

    /**
     * PATCH /driver/bookings/{id}/start
     * Starts the active driver booking. Status transitions: any → OTW
     */
    startDriverBooking: builder.mutation<
      unknown,
      {
        bookingId: number;
        meter_reading_start?: number;
        meter_reading_start_image_url?: string;
        driver_lat?: number;
        driver_lng?: number;
      }
    >({
      query: ({ bookingId, meter_reading_start, meter_reading_start_image_url, driver_lat, driver_lng }) => ({
        url: `/driver/bookings/${bookingId}/start`,
        method: 'PATCH',
        body: { meter_reading_start, meter_reading_start_image_url, driver_lat, driver_lng },
      }),
      invalidatesTags: ['ChauffeurBooking'],
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            chauffeurApi.util.updateQueryData('getDriverActiveBooking', undefined, (draft) => {
              if (draft) {
                draft.status = 'OTW';
                const activeLog = getActiveLog(draft.chauffeur_trip_daily_logs);
                if (activeLog) {
                  activeLog.status = 'STARTED';
                  activeLog.start_time = new Date().toISOString();
                }
              }
            }),
          );
        } catch { /* UI handles errors */ }
      },
    }),

    /**
     * PATCH /driver/bookings/{id}/arrived
     * Driver has arrived at pickup. Status transitions: OTW → ARRIVED
     */
    markDriverArrived: builder.mutation<unknown, { bookingId: number }>({
      query: ({ bookingId }) => ({
        url: `/driver/bookings/${bookingId}/arrived`,
        method: 'PATCH',
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            chauffeurApi.util.updateQueryData('getDriverActiveBooking', undefined, (draft) => {
              if (draft) {
                if (draft.trip_type === 'OUT_STATION' || draft.chauffeur_trip_daily_logs.length === 0) {
                  draft.status = 'ARRIVED';
                }
                const activeLog = getActiveLog(draft.chauffeur_trip_daily_logs);
                if (activeLog) activeLog.status = 'ARRIVED';
              }
            }),
          );
        } catch { /* UI handles errors */ }
      },
    }),

    /**
     * PATCH /driver/bookings/{id}/onboard
     * Passenger is onboard, trip in progress. Status transitions: ARRIVED → IN_PROGRESS
     */
    markDriverOnboard: builder.mutation<unknown, { bookingId: number }>({
      query: ({ bookingId }) => ({
        url: `/driver/bookings/${bookingId}/onboard`,
        method: 'PATCH',
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            chauffeurApi.util.updateQueryData('getDriverActiveBooking', undefined, (draft) => {
              if (draft) {
                draft.status = 'IN_PROGRESS';
                const activeLog = getActiveLog(draft.chauffeur_trip_daily_logs);
                if (activeLog) activeLog.status = 'IN_PROGRESS';
              }
            }),
          );
        } catch { /* UI handles errors */ }
      },
    }),

    /**
     * PATCH /driver/bookings/{id}/dropoff
     * Passenger dropped off. Status transitions: IN_PROGRESS → DROPPED_OFF
     */
    markDriverDropoff: builder.mutation<unknown, { bookingId: number }>({
      query: ({ bookingId }) => ({
        url: `/driver/bookings/${bookingId}/dropoff`,
        method: 'PATCH',
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            chauffeurApi.util.updateQueryData('getDriverActiveBooking', undefined, (draft) => {
              if (draft) {
                if (draft.trip_type === 'OUT_STATION') draft.status = 'DROPPED_OFF';
                
                const activeLog = getActiveLog(draft.chauffeur_trip_daily_logs);
                if (activeLog) activeLog.status = 'DROPPED_OFF';
              }
            }),
          );
        } catch { /* UI handles errors */ }
      },
    }),

    /**
     * PATCH /driver/bookings/{id}/end
     * Driver ends the daily (or final) trip.
     */
    endDriverBooking: builder.mutation<
      { success: boolean; is_last_day: boolean },
      { bookingId: number; body: EndDailyTripDto }
    >({
      query: ({ bookingId, body }) => ({
        url: `/driver/bookings/${bookingId}/end`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['ChauffeurBooking'],
    }),
  }),
});

export const {
  useGetDriverActiveBookingQuery,
  useStartDriverBookingMutation,
  useMarkDriverArrivedMutation,
  useMarkDriverOnboardMutation,
  useMarkDriverDropoffMutation,
  useEndDriverBookingMutation,
} = chauffeurApi;

import { baseApi } from '../../../core/api/baseApi';
import { employeeShuttleApi, type GetShuttleTripsForEmployeeParams } from './employeeShuttleApi';

export type SelfAttendanceParams = {
    shuttleTripId: number;
    /** Same args used for the getShuttleTripsForEmployee cache entry this screen reads from,
     * so the confirmed-success patch below targets the right cache key. */
    queryArgs: GetShuttleTripsForEmployeeParams;
};

export type ScanBoardingParams = {
    shuttle_trip_id: number;
    employee_id: string;
    lat?: number;
    lng?: number;
};

export type ScanBoardingResult = {
    id: number;
    shuttle_trip_id: number;
    employee_id: string;
    status: string;
    scanned_at: string | null;
};

export const boardingApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        scanBoarding: builder.mutation<ScanBoardingResult, ScanBoardingParams>({
            query: (body) => ({
                url: '/shuttle-boarding-logs/scan',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Attendance'],
        }),

        // Deliberately not optimistic-before-confirmation: the trip's SCHEDULED-only lock is
        // enforced server-side, and this button must only ever show "absent" once the server
        // has actually confirmed it — patching before knowing the outcome would visually
        // succeed even on a rejected (e.g. ride already started) request. But waiting on a
        // *second*, separate invalidatesTags-triggered refetch to learn something we already
        // know (the mutation just told us) left a real gap: the button's own spinner turns off
        // the instant the POST resolves, while the cache — and therefore the button's color and
        // the FlipCard, which shares this same data — stays stale until that background refetch
        // finishes. So: patch directly, but only after queryFulfilled confirms success. No
        // invalidatesTags needed here — this action only ever changes this one field on this
        // one trip, so the direct patch is already complete; a follow-up refetch would just
        // trigger the FlipCard's loading skeleton for data we've already applied correctly.
        markSelfAbsent: builder.mutation<{ status: string | null }, SelfAttendanceParams>({
            query: ({ shuttleTripId }) => ({
                url: '/shuttle-boarding-logs/self-mark-absent',
                method: 'POST',
                body: { shuttle_trip_id: shuttleTripId },
            }),
            async onQueryStarted({ shuttleTripId, queryArgs }, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                    dispatch(
                        employeeShuttleApi.util.updateQueryData('getShuttleTripsForEmployee', queryArgs, (draft) => {
                            const trip = draft.find((t) => t.id === shuttleTripId);
                            if (trip) trip.my_self_marked_absent = true;
                        }),
                    );
                } catch {
                    // Request failed — cache was never touched, nothing to roll back.
                }
            },
        }),

        undoSelfAbsent: builder.mutation<{ status: string | null }, SelfAttendanceParams>({
            query: ({ shuttleTripId }) => ({
                url: '/shuttle-boarding-logs/self-undo-absent',
                method: 'POST',
                body: { shuttle_trip_id: shuttleTripId },
            }),
            async onQueryStarted({ shuttleTripId, queryArgs }, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                    dispatch(
                        employeeShuttleApi.util.updateQueryData('getShuttleTripsForEmployee', queryArgs, (draft) => {
                            const trip = draft.find((t) => t.id === shuttleTripId);
                            if (trip) trip.my_self_marked_absent = false;
                        }),
                    );
                } catch {
                    // Request failed — cache was never touched, nothing to roll back.
                }
            },
        }),
    }),
});

export const {
    useScanBoardingMutation,
    useMarkSelfAbsentMutation,
    useUndoSelfAbsentMutation,
} = boardingApi;

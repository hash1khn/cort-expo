import { baseApi } from '../../../core/api/baseApi';

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
    }),
});

export const { useScanBoardingMutation } = boardingApi;

import { baseApi } from '../../../core/api/baseApi';

type SubmitProblemReportRequest = {
  message: string;
  issue_type: 'app_issue' | 'ride_issue' | 'other';
};

type SubmitProblemReportResponse = {
  data: {
    id: number;
    message: string;
    issue_type: 'app_issue' | 'ride_issue' | 'other' | null;
    reported_by_user_id: string;
    company_id: number | null;
    created_at: string | null;
  };
};

export const problemReportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    submitProblemReport: builder.mutation<SubmitProblemReportResponse, SubmitProblemReportRequest>({
      query: (body) => ({
        url: '/reports/problems',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useSubmitProblemReportMutation } = problemReportsApi;

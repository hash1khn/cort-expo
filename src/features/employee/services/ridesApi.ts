import { baseApi } from '../../../core/api/baseApi';

export type RideShareTripType = 'shuttle' | 'chauffeur';

type CreateRideShareLinkRequest = {
    tripId: number;
    tripType: RideShareTripType;
};

type CreateRideShareLinkResponse = {
    url: string;
    expiresAt: string;
};

export const ridesApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        createRideShareLink: build.mutation<CreateRideShareLinkResponse, CreateRideShareLinkRequest>({
            query: (body) => ({
                url: '/rides/share-link',
                method: 'POST',
                body,
            }),
        }),
    }),
});

export const { useCreateRideShareLinkMutation } = ridesApi;


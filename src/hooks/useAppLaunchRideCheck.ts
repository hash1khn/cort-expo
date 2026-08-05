import { useEffect, useRef } from 'react';
import { tokenStorage } from '../features/auth/utils/tokenStorage';
import { env } from '../core/config/env';

interface ActiveRideData {
    tripId: number;
    status: string;
    role: 'driver' | 'employee';
    driverName: string | null;
    vehicleInfo: string | null;
    currentStopId: number | null;
    direction: string | null;
    /** This employee's own boarding/drop-off status ('BOARDED' | 'DROPPED_OFF' | 'ABSENT' | null).
     * Only present for role 'employee' — distinct from `status` (the trip-level status), since an
     * evening trip can still be IN_PROGRESS for other riders after this employee is dropped off. */
    myBoardingStatus?: string | null;
    /** Driver's last-known GPS position from Redis (shuttle:last_coord), seeded at trip
     * start and updated on every live ping. Null if the driver hasn't sent a location yet. */
    lastLat: number | null;
    lastLng: number | null;
}


export function useAppLaunchRideCheck(
    userId: string | null | undefined,
    onActiveRideFound: (rideData: ActiveRideData) => void,
) {
    const hasChecked = useRef(false);

    useEffect(() => {
        if (!userId || hasChecked.current) return;
        hasChecked.current = true;

        const check = async () => {
            try {
                const token = await tokenStorage.getAccessToken();
                if (!token) return;

                // Send the client's local calendar date so the server query window
                // matches the user's timezone (fixes off-by-one when UTC != local date).
                const now = new Date();
                const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

                const baseUrl = env.API_URL.replace(/\/$/, '');
                const res = await fetch(
                    `${baseUrl}/shuttle-trips/active?userId=${encodeURIComponent(userId)}&date=${localDate}`,
                    { headers: { Authorization: `Bearer ${token}` } },
                );

                if (!res.ok) return;

                // NestJS returns an empty body (not "null") when the service returns null.
                // Safely handle both cases to avoid JSON parse errors.
                const text = await res.text();
                if (!text) return;
                const data = JSON.parse(text);
                if (data && data.tripId) {
                    onActiveRideFound(data as ActiveRideData);
                }
            } catch (err) {
                console.warn('[useAppLaunchRideCheck] Error:', err);
            }
        };

        check();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);
}

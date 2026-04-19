import { useEffect, useCallback, useRef } from 'react';
import { socketService } from '../services/socket.service';

interface LocationPayload {
    tripId: string;
    lat: number;
    lng: number;
    heading: number;
    speed: number;
}

interface ChauffeurStatusPayload {
    bookingId: number;
    status: 'OTW' | 'ARRIVED' | 'IN_PROGRESS' | 'DROPPED_OFF' | 'ENDED';
}

interface UseChauffeurSocketOptions {
    /** Chauffeur booking ID — used as the "trip room" key (ride_{bookingId}) */
    bookingId: number | string;
    /** Authenticated employee / passenger user ID */
    userId: string;
    onLocationUpdate?: (data: LocationPayload) => void;
    onStatusChange?: (data: ChauffeurStatusPayload) => void;
    onRideEnded?: () => void;
}

/**
 * Joins the chauffeur ride room and wires up real-time listeners for
 * the employee (passenger) side of a chauffeur booking.
 *
 * Two events are handled:
 *  - driver:location  — GPS coord from the driver; forwarded to onLocationUpdate
 *  - chauffeur:status — booking-status change from the driver's step actions;
 *                       forwarded to onStatusChange. If status === 'ENDED',
 *                       onRideEnded is also called.
 *
 * The socket room convention matches the driver app: ride_{bookingId}.
 * The employee also receives events via their personal room (user_{userId}),
 * which is joined automatically on socket connection. Both rooms are used:
 *   - personal room: receives status pushes even when NOT on the ride screen
 *   - ride room: receives GPS location updates
 */
export function useChauffeurSocket({
    bookingId,
    userId,
    onLocationUpdate,
    onStatusChange,
    onRideEnded,
}: UseChauffeurSocketOptions) {
    // Keep refs to the latest callbacks so handlers registered once on mount
    // always call the current version without causing the effect to re-run.
    const onLocationUpdateRef = useRef(onLocationUpdate);
    const onStatusChangeRef = useRef(onStatusChange);
    const onRideEndedRef = useRef(onRideEnded);
    onLocationUpdateRef.current = onLocationUpdate;
    onStatusChangeRef.current = onStatusChange;
    onRideEndedRef.current = onRideEnded;

    useEffect(() => {
        if (!bookingId || !userId) return;

        // Join the ride room so we receive driver:location broadcasts
        socketService.joinRide(bookingId, userId, 'employee', 'chauffeur');

        const handleLocation = (data: LocationPayload) => {
            onLocationUpdateRef.current?.(data);
        };

        const handleStatus = (data: ChauffeurStatusPayload) => {
            onStatusChangeRef.current?.(data);
            if (data.status === 'ENDED') {
                onRideEndedRef.current?.();
            }
        };

        socketService.on('driver:location', handleLocation);
        socketService.on('chauffeur:status', handleStatus);

        return () => {
            socketService.off('driver:location', handleLocation);
            socketService.off('chauffeur:status', handleStatus);
            socketService.leaveRide();
        };
    }, [bookingId, userId]);

    /**
     * Emit a driver-request event (used by employee for multi-day IN_CITY trips
     * when they want to call the captain for next-day pickup).
     * NOTE: this is complementary to the HTTP POST /request-driver endpoint.
     * The HTTP call is the source of truth; this is a real-time hint to the driver.
     */
    const requestCaptain = useCallback(
        (pickupLocation?: string) => {
            socketService.emit('chauffeur:request-captain', {
                bookingId: String(bookingId),
                userId,
                pickupLocation,
            });
        },
        [bookingId, userId],
    );

    return { requestCaptain };
}

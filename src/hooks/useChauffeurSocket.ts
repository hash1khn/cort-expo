import { useEffect, useCallback } from 'react';
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
    useEffect(() => {
        if (!bookingId || !userId) return;

        // Join the ride room so we receive driver:location broadcasts
        socketService.joinRide(bookingId, userId, 'employee');

        const handleLocation = (data: LocationPayload) => {
            onLocationUpdate?.(data);
        };

        const handleStatus = (data: ChauffeurStatusPayload) => {
            onStatusChange?.(data);
            if (data.status === 'ENDED') {
                onRideEnded?.();
            }
        };

        socketService.on('driver:location', handleLocation);
        socketService.on('chauffeur:status', handleStatus);

        return () => {
            socketService.off('driver:location', handleLocation);
            socketService.off('chauffeur:status', handleStatus);
            socketService.leaveRide();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookingId, userId]);

    /**
     * Emit a driver-request event (used by employee for multi-day IN_CITY trips
     * when they want to call the captain for next-day pickup).
     * NOTE: this is complementary to the HTTP POST /request-driver endpoint.
     * The HTTP call is the source of truth; this is a real-time hint to the driver.
     */
    const requestCaptain = useCallback(
        (pickupLocation?: string) => {
            socketService['socket']?.emit('chauffeur:request-captain', {
                bookingId: String(bookingId),
                userId,
                pickupLocation,
            });
        },
        [bookingId, userId],
    );

    return { requestCaptain };
}

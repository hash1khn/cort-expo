import { useEffect, useCallback } from 'react';
import { socketService } from '../services/socket.service';

interface LocationPayload {
    tripId: string;
    lat: number;
    lng: number;
    heading: number;
    speed: number;
}

interface StopArrivedPayload {
    stopId: number;
    stopName: string;
    arrivedAt: string;
}

interface RideProceedingPayload {
    nextStopId: number | null;
    nextStopName: string | null;
    departedAt: string;
}

interface AttendanceMarkedPayload {
    employeeId: string;
    employeeName: string;
    markedBy: 'self' | 'driver';
    timestamp: string;
}

interface RideEndedPayload {
    tripId: number;
    endedAt: string;
}

interface UseRideSocketOptions {
    tripId: number | string;
    userId: string;
    role: 'driver' | 'employee';
    /** Pass 'shuttle' or 'chauffeur' so the server can apply the correct geofence logic */
    tripType?: 'shuttle' | 'chauffeur';
    onLocationUpdate?: (data: LocationPayload) => void;
    onStopArrived?: (data: StopArrivedPayload) => void;
    onRideProceeding?: (data: RideProceedingPayload) => void;
    onAttendanceMarked?: (data: AttendanceMarkedPayload) => void;
    onRideEnded?: (data: RideEndedPayload) => void;
}

/**
 * Joins the ride room and wires up all ride-specific socket event listeners.
 * Returns a sendLocation function (used by drivers to stream GPS position).
 */
export function useRideSocket({
    tripId,
    userId,
    role,
    tripType,
    onLocationUpdate,
    onStopArrived,
    onRideProceeding,
    onAttendanceMarked,
    onRideEnded,
}: UseRideSocketOptions) {
    useEffect(() => {
        if (!tripId || !userId) return;

        socketService.joinRide(tripId, userId, role, tripType);

        if (onLocationUpdate) socketService.on('driver:location', onLocationUpdate);
        if (onStopArrived) socketService.on('stop:arrived', onStopArrived);
        if (onRideProceeding) socketService.on('ride:proceeding', onRideProceeding);
        if (onAttendanceMarked) socketService.on('attendance:marked', onAttendanceMarked);
        if (onRideEnded) socketService.on('RIDE_ENDED', onRideEnded);

        return () => {
            if (onLocationUpdate) socketService.off('driver:location', onLocationUpdate);
            if (onStopArrived) socketService.off('stop:arrived', onStopArrived);
            if (onRideProceeding) socketService.off('ride:proceeding', onRideProceeding);
            if (onAttendanceMarked) socketService.off('attendance:marked', onAttendanceMarked);
            if (onRideEnded) socketService.off('RIDE_ENDED', onRideEnded);
            // Clear the ride-room tracking so a finished trip is not replayed on reconnect
            socketService.leaveRide();
        };
    }, [tripId, userId, role, onLocationUpdate, onStopArrived, onRideProceeding, onAttendanceMarked, onRideEnded]);

    const sendLocation = useCallback(
        (coords: { lat: number; lng: number; heading: number; speed: number }) => {
            socketService.sendLocationUpdate(tripId, coords);
        },
        [tripId],
    );

    return { sendLocation };
}

import { useEffect, useCallback, useRef } from 'react';
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
    onPolylineUpdated?: () => void;
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
    onPolylineUpdated,
}: UseRideSocketOptions) {
    // Refs hold the latest callbacks so handlers registered once on mount
    // always call the current version without causing the effect to re-run.
    const onLocationUpdateRef = useRef(onLocationUpdate);
    const onStopArrivedRef = useRef(onStopArrived);
    const onRideProceedingRef = useRef(onRideProceeding);
    const onAttendanceMarkedRef = useRef(onAttendanceMarked);
    const onRideEndedRef = useRef(onRideEnded);
    const onPolylineUpdatedRef = useRef(onPolylineUpdated);
    onLocationUpdateRef.current = onLocationUpdate;
    onStopArrivedRef.current = onStopArrived;
    onRideProceedingRef.current = onRideProceeding;
    onAttendanceMarkedRef.current = onAttendanceMarked;
    onRideEndedRef.current = onRideEnded;
    onPolylineUpdatedRef.current = onPolylineUpdated;

    useEffect(() => {
        if (!tripId || !userId) return;

        socketService.joinRide(tripId, userId, role, tripType);

        const handleLocation = (data: LocationPayload) => onLocationUpdateRef.current?.(data);
        const handleStopArrived = (data: StopArrivedPayload) => onStopArrivedRef.current?.(data);
        const handleRideProceeding = (data: RideProceedingPayload) => onRideProceedingRef.current?.(data);
        const handleAttendanceMarked = (data: AttendanceMarkedPayload) => onAttendanceMarkedRef.current?.(data);
        const handleRideEnded = (data: RideEndedPayload) => onRideEndedRef.current?.(data);
        const handlePolylineUpdated = () => onPolylineUpdatedRef.current?.();

        socketService.on('driver:location', handleLocation);
        socketService.on('stop:arrived', handleStopArrived);
        socketService.on('ride:proceeding', handleRideProceeding);
        socketService.on('attendance:marked', handleAttendanceMarked);
        socketService.on('RIDE_ENDED', handleRideEnded);
        socketService.on('shuttle:polyline_updated', handlePolylineUpdated);

        return () => {
            socketService.off('driver:location', handleLocation);
            socketService.off('stop:arrived', handleStopArrived);
            socketService.off('ride:proceeding', handleRideProceeding);
            socketService.off('attendance:marked', handleAttendanceMarked);
            socketService.off('RIDE_ENDED', handleRideEnded);
            socketService.off('shuttle:polyline_updated', handlePolylineUpdated);
            socketService.leaveRide();
        };
    }, [tripId, userId, role, tripType]);

    const sendLocation = useCallback(
        (coords: { lat: number; lng: number; heading: number; speed: number }) => {
            socketService.sendLocationUpdate(tripId, coords);
        },
        [tripId],
    );

    return { sendLocation };
}

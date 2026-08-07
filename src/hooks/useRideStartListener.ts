import { useEffect } from 'react';
import { socketService } from '../services/socket.service';

/**
 * Listens for the RIDE_STARTED event on the socket.
 * Used on the employee home screen to navigate to the active ride
 * when a driver starts a trip while the app is open.
 */
export function useRideStartListener(onRideStarted: (data: {
    tripId: number;
    driverName: string;
    vehicleInfo: string;
    /** This employee's own boarding status ('BOARDED' | 'DROPPED_OFF' | 'ABSENT' | null),
     * computed server-side at the moment this event was emitted — the authoritative,
     * zero-extra-request way to know whether this employee opted out of (or was marked
     * absent from) this specific trip, without waiting on a client-side refetch. */
    myBoardingStatus?: string | null;
    lastLat?: number;
    lastLng?: number;
    lastLocationTs?: number;
}) => void) {
    useEffect(() => {
        socketService.on('RIDE_STARTED', onRideStarted);
        return () => {
            socketService.off('RIDE_STARTED', onRideStarted);
        };
    }, [onRideStarted]);
}

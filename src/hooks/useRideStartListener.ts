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
}) => void) {
    useEffect(() => {
        socketService.on('RIDE_STARTED', onRideStarted);
        return () => {
            socketService.off('RIDE_STARTED', onRideStarted);
        };
    }, [onRideStarted]);
}

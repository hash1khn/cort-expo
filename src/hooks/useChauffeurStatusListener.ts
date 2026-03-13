import { useEffect } from 'react';
import { socketService } from '../services/socket.service';

/**
 * Listens for chauffeur status update events.
 * Used on the employee home screen to navigate to the active ride
 * or update the UI when a driver's trip status changes.
 */
export function useChauffeurStatusListener(onStatusChange: (data: {
    bookingId: number;
    status: string;
}) => void) {
    useEffect(() => {
        socketService.on('chauffeur:status', onStatusChange);
        return () => {
            socketService.off('chauffeur:status', onStatusChange);
        };
    }, [onStatusChange]);
}

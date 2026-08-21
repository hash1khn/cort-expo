import { useEffect } from 'react';
import { socketService } from '../services/socket.service';
import { chauffeurApi } from '../features/chauffeur/services/chauffeur.api';
import { useAppDispatch } from '../store/hooks';

/**
 * Keeps the marketplace request feed live: invalidates the BroadcastRequests
 * RTK Query cache whenever a new booking is broadcast nearby, or a broadcast
 * is closed out (another driver accepted it, or an admin assigned it manually).
 * The 15s poll in getBroadcastRequests is the fallback if the socket is down.
 */
export function useBroadcastRequestsListener(): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const invalidate = () => {
      dispatch(chauffeurApi.util.invalidateTags(['BroadcastRequests']));
    };

    socketService.on('booking:broadcast:new', invalidate);
    socketService.on('booking:broadcast:closed', invalidate);

    return () => {
      socketService.off('booking:broadcast:new', invalidate);
      socketService.off('booking:broadcast:closed', invalidate);
    };
  }, [dispatch]);
}

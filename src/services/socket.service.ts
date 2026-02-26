import { io, Socket } from 'socket.io-client';
import { env } from '../core/config/env';

class SocketService {
    private socket: Socket | null = null;

    connect(token: string) {
        if (this.socket?.connected) return;

        // Clean up any stale disconnected socket
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }

        this.socket = io(`${env.API_URL}/rides`, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });

        this.socket.on('connect', () => {
            console.log('[Socket] Connected:', this.socket?.id);
        });
        this.socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });
        this.socket.on('connect_error', (err) => {
            console.warn('[Socket] Connection error:', err.message);
        });
    }

    joinRide(tripId: number | string, userId: string, role: 'driver' | 'employee') {
        this.socket?.emit('join:ride', { tripId: String(tripId), userId, role });
    }

    sendLocationUpdate(
        tripId: number | string,
        coords: { lat: number; lng: number; heading: number; speed: number },
    ) {
        this.socket?.emit('location:update', { tripId: String(tripId), ...coords });
    }

    on(event: string, callback: (...args: any[]) => void) {
        this.socket?.on(event, callback);
    }

    off(event: string, callback: (...args: any[]) => void) {
        this.socket?.off(event, callback);
    }

    disconnect() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
            console.log('[Socket] Manually disconnected');
        }
    }

    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }
}

export const socketService = new SocketService();

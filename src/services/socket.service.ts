import { io, Socket } from 'socket.io-client';
import { env } from '../core/config/env';
import { tokenStorage } from '../features/auth/utils/tokenStorage';

class SocketService {
  private socket: Socket | null = null;

  /**
   * Persistent registry of every (event → callback) pair registered via on().
   * Survives calls to disconnect() so that when connect() creates a brand-new
   * socket, all application listeners are immediately re-attached without any
   * caller needing to know a reconnect happened.
   *
   * Using a Map<event, Set<cb>> ensures:
   *  • The same callback registered twice stays only once (idempotent).
   *  • off() removes from both the live socket AND this registry, preventing
   *    stale handlers from re-appearing after a reconnect.
   */
  private registry: Map<string, Set<(...args: any[]) => void>> = new Map();

  /** Last token used to connect — needed to reconnect after server kicks us. */
  private currentToken: string | null = null;
  /** Set to true when WE initiate the disconnect so we skip the server-kick recovery path. */
  private isManualDisconnect = false;
  /** Pending server-disconnect retry timer handle. */
  private serverDisconnectRetryTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * The most recent join:ride payload.
   * Socket.IO server-side rooms are per-connection: when the transport
   * reconnects the server calls handleConnection again (rejoining user_X) but
   * does NOT automatically put the socket back into ride_Y.  We track the last
   * join here and replay it on every 'connect' event.
   */
  private pendingRideJoin: { tripId: string; userId: string; role: 'driver' | 'employee'; tripType?: 'shuttle' | 'chauffeur' } | null = null;

  // ─────────────────────────────────────────────────────────────────────────
  // Connection lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  connect(token: string) {
    if (this.socket?.connected) return;

    this.currentToken = token;
    this.isManualDisconnect = false;

    // Tear down any stale socket (disconnected but not yet nulled)
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(`${env.API_URL}/rides`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      // Never stop retrying — connectivity can be restored at any point.
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000, // cap at 30 s between attempts
      randomizationFactor: 0.5,
    });

    // Internal system listeners (not stored in registry)
    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
      // Rejoin ride room — server lost our membership when transport dropped
      if (this.pendingRideJoin) {
        this.socket?.emit('join:ride', this.pendingRideJoin);
      }
    });

    this.socket.on('disconnect', async (reason) => {
      console.log('[Socket] Disconnected:', reason);

      // Socket.IO never auto-reconnects after 'io server disconnect' because it
      // treats a server-side socket.disconnect() as intentional. We handle it
      // ourselves: refresh the token (server likely kicked us for an expired JWT)
      // then create a fresh socket connection.
      if (reason === 'io server disconnect' && !this.isManualDisconnect) {
        console.warn('[Socket] Server-initiated disconnect — refreshing token and reconnecting');
        try {
          const freshToken = await tokenStorage.refreshAccessToken();
          const tokenToUse = freshToken ?? this.currentToken;
          if (tokenToUse) {
            // Brief delay to avoid hammering the server if it keeps rejecting.
            this.serverDisconnectRetryTimer = setTimeout(() => {
              this.serverDisconnectRetryTimer = null;
              if (!this.isManualDisconnect) {
                this.connect(tokenToUse);
              }
            }, 1500);
          }
        } catch {
          console.warn('[Socket] Token refresh failed after server disconnect');
        }
      }
    });

    // If the server rejects the connection (e.g. expired JWT), refresh the
    // token and reconnect with a fresh one rather than retrying with the same
    // dead credentials.
    this.socket.on('connect_error', async (err) => {
      console.warn('[Socket] Connection error:', err.message);
      const isAuthError =
        err.message?.toLowerCase().includes('unauthorized') ||
        err.message?.toLowerCase().includes('jwt') ||
        err.message?.toLowerCase().includes('token');

      if (isAuthError) {
        try {
          const freshToken = await tokenStorage.refreshAccessToken();
          if (freshToken && this.socket) {
            // Update credentials so the next reconnection attempt uses the
            // new token without needing to tear down the socket.
            (this.socket.auth as Record<string, string>).token = freshToken;
          }
        } catch {
          console.warn('[Socket] Token refresh failed');
        }
      }
    });

    // Re-attach every listener that was registered before this socket existed
    // (or before the previous one was torn down).
    this.registry.forEach((callbacks, event) => {
      callbacks.forEach((cb) => this.socket!.on(event, cb));
    });
  }

  disconnect() {
    // Mark as intentional so the 'io server disconnect' recovery path is skipped.
    this.isManualDisconnect = true;
    if (this.serverDisconnectRetryTimer !== null) {
      clearTimeout(this.serverDisconnectRetryTimer);
      this.serverDisconnectRetryTimer = null;
    }
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      console.log('[Socket] Manually disconnected');
    }
    // registry is intentionally NOT cleared — listeners will be re-attached
    // when connect() is called again (e.g. app returns to foreground).
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Event bus
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Register an event listener.
   *
   * If the socket is live, the handler is attached immediately.
   * If not (e.g. called before connect(), or between a background-disconnect
   * and the next foreground-connect), it is stored in the registry and will be
   * attached automatically the next time connect() runs.
   */
  on(event: string, callback: (...args: any[]) => void) {
    if (!this.registry.has(event)) {
      this.registry.set(event, new Set());
    }
    this.registry.get(event)!.add(callback);

    // Attach right now if a socket already exists
    this.socket?.on(event, callback);
  }

  /** Remove an event listener from both the live socket and the registry. */
  off(event: string, callback: (...args: any[]) => void) {
    this.registry.get(event)?.delete(callback);
    this.socket?.off(event, callback);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Ride-specific helpers
  // ─────────────────────────────────────────────────────────────────────────

  joinRide(tripId: number | string, userId: string, role: 'driver' | 'employee', tripType?: 'shuttle' | 'chauffeur') {
    const tripIdStr = String(tripId);
    this.pendingRideJoin = { tripId: tripIdStr, userId, role, tripType };
    this.socket?.emit('join:ride', { tripId: tripIdStr, userId, role, tripType });
  }

  /**
   * Call when leaving the ride screen so a stale ride ID is not replayed on
   * the next reconnect after the ride is over.
   */
  leaveRide() {
    this.pendingRideJoin = null;
  }

  sendLocationUpdate(
    tripId: number | string,
    coords: { lat: number; lng: number; heading: number; speed: number; clientTs?: number },
  ) {
    this.socket?.emit('location:update', { tripId: String(tripId), ...coords });
  }

  /**
   * Emit any arbitrary event. Prefer named helpers above for type safety.
   * Use this for one-off events like chauffeur:request-captain.
   */
  emit(event: string, data: unknown) {
    if (!this.socket?.connected) {
      console.warn(`[Socket] emit('${event}') dropped — socket not connected`);
      return;
    }
    this.socket.emit(event, data);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();

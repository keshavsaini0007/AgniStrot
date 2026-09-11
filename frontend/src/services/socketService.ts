import { io, Socket } from 'socket.io-client';
import { env } from '@/config/env';

/**
 * Socket.io Service for Real-time Notifications
 * 
 * Connects to backend Socket.io server and handles:
 * - Authentication via JWT token
 * - Automatic room joining (role-based + site-based)
 * - Real-time alert events (alert:new, alert:escalated)
 * 
 * Backend events:
 * - alert:new: New alert created
 * - alert:escalated: Alert escalated to higher severity
 * 
 * Backend rooms:
 * - role:<role>: All users with that role
 * - site:<siteId>: All users assigned to that site
 */

type AlertEventData = {
  alertId: string;
  siteId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ruleCode: string;
  message: string;
  createdAt: string;
};

type SocketEventHandler = (data: AlertEventData) => void;

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  /**
   * Initialize Socket.io connection with JWT authentication
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('[Socket.io] Already connected');
      return;
    }

    // Extract base URL without /api/v1 suffix
    const baseUrl = env.API_BASE_URL.replace(/\/api\/v1$/, '');

    this.socket = io(baseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('[Socket.io] Connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket.io] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, manual reconnect needed
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket.io] Connection error:', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[Socket.io] Max reconnect attempts reached');
        this.disconnect();
      }
    });
  }

  /**
   * Disconnect from Socket.io server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('[Socket.io] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Listen for new alert events
   */
  onNewAlert(handler: SocketEventHandler): void {
    this.socket?.on('alert:new', handler);
  }

  /**
   * Listen for alert escalation events
   */
  onAlertEscalated(handler: SocketEventHandler): void {
    this.socket?.on('alert:escalated', handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler?: SocketEventHandler): void {
    if (handler) {
      this.socket?.off(event, handler);
    } else {
      this.socket?.off(event);
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket instance (for advanced usage)
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Singleton instance
export const socketService = new SocketService();

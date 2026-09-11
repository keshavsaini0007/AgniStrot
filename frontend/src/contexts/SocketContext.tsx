import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { socketService } from '@/services/socketService';
import { useAuthStore } from '@/store/authStore';
import { getToken } from '@/api/token';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/useMines';

/**
 * Socket.io Context Provider
 * 
 * Manages Socket.io connection lifecycle:
 * - Auto-connects when user is authenticated
 * - Auto-disconnects on logout
 * - Provides socket status to components
 * - Handles real-time event listeners globally
 * 
 * Real-time features:
 * - Alert notifications (alert:new, alert:escalated)
 * - Auto-refresh queries when new data arrives
 */

interface SocketContextValue {
  isConnected: boolean;
  lastAlertEvent: AlertEvent | null;
  lastRecordEvent: RecordEvent | null;
}

interface AlertEvent {
  type: 'new' | 'escalated';
  alertId: string;
  siteId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ruleCode: string;
  message: string;
  createdAt: string;
  timestamp: number; // Local timestamp for UI
}

type RecordEventSource = 'inspection' | 'incident' | 'attendance';

interface RecordEvent {
  source: RecordEventSource;
  recordId: string;
  seq: number; // Monotonic counter so consumers can re-trigger animations
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const { isAuthenticated } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [lastAlertEvent, setLastAlertEvent] = useState<AlertEvent | null>(null);
  const [lastRecordEvent, setLastRecordEvent] = useState<RecordEvent | null>(null);
  const recordSeqRef = useRef(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) {
      // Disconnect if user logs out
      socketService.disconnect();
      setIsConnected(false);
      return;
    }

    // Get JWT token from storage
    const token = getToken();
    if (!token) {
      console.warn('[Socket] No token available, skipping connection');
      return;
    }

    // Connect to Socket.io server
    console.log('[Socket] Connecting with JWT...');
    socketService.connect(token);

    // Set up connection status tracking
    const checkConnection = () => {
      setIsConnected(socketService.isConnected());
    };

    const intervalId = setInterval(checkConnection, 1000);
    checkConnection();

    // Set up event listeners
    const handleNewAlert = (data: any) => {
      console.log('[Socket] New alert received:', data);
      
      const event: AlertEvent = {
        type: 'new',
        alertId: data.alertId,
        siteId: data.siteId,
        severity: data.severity,
        ruleCode: data.ruleCode,
        message: data.message,
        createdAt: data.createdAt,
        timestamp: Date.now(),
      };
      
      setLastAlertEvent(event);
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    };

    const handleAlertEscalated = (data: any) => {
      console.log('[Socket] Alert escalated:', data);
      
      const event: AlertEvent = {
        type: 'escalated',
        alertId: data.alertId,
        siteId: data.siteId,
        severity: data.severity,
        ruleCode: data.ruleCode,
        message: data.message,
        createdAt: data.createdAt,
        timestamp: Date.now(),
      };
      
      setLastAlertEvent(event);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    };

    socketService.onNewAlert(handleNewAlert);
    socketService.onAlertEscalated(handleAlertEscalated);

    // Record-sync events from the mobile app (inspection:new, incident:new,
    // attendance:new). Invalidates the matching list query + the dashboard
    // (which aggregates all domains) so pages refetch and re-animate.
    const handleRecordNew = (source: RecordEventSource) => (data: { recordId?: string }) => {
      console.log(`[Socket] ${source}:new received:`, data);

      recordSeqRef.current += 1;
      setLastRecordEvent({
        source,
        recordId: data.recordId ?? '',
        seq: recordSeqRef.current,
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      if (source === 'inspection') {
        queryClient.invalidateQueries({ queryKey: queryKeys.inspections.all });
      } else if (source === 'incident') {
        queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      }
    };

    socketService.onRecordNew('inspection', handleRecordNew('inspection'));
    socketService.onRecordNew('incident', handleRecordNew('incident'));
    socketService.onRecordNew('attendance', handleRecordNew('attendance'));

    // Cleanup on unmount or auth change
    return () => {
      clearInterval(intervalId);
      socketService.off('alert:new', handleNewAlert);
      socketService.off('alert:escalated', handleAlertEscalated);
      socketService.off('inspection:new');
      socketService.off('incident:new');
      socketService.off('attendance:new');
      socketService.disconnect();
      setIsConnected(false);
    };
  }, [isAuthenticated, queryClient]);

  const value: SocketContextValue = {
    isConnected,
    lastAlertEvent,
    lastRecordEvent,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

/**
 * Hook to access Socket.io context
 */
export const useSocket = (): SocketContextValue => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

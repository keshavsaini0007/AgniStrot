import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { syncService } from '@/services/syncService';
import { syncKeys } from '@/hooks/useSync';
import { queryKeys } from '@/hooks/useMines';

export function SyncMonitor() {
  const queryClient = useQueryClient();
  const running = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = Boolean(state.isConnected);
      if (!connected || running.current) return;
      running.current = true;
      syncService
        .syncNow()
        .then(async () => {
          await queryClient.invalidateQueries({ queryKey: syncKeys.status });
          await queryClient.invalidateQueries({ queryKey: ['sync', 'total'] });
          await queryClient.invalidateQueries({ queryKey: queryKeys.inspections.all });
        })
        .catch(() => {})
        .finally(() => {
          running.current = false;
        });
    });
    return unsubscribe;
  }, [queryClient]);

  return null;
}
import { useEffect, useState } from 'react';
import { useSocket } from '@/contexts/SocketContext';

type RecordEventSource = 'inspection' | 'incident' | 'attendance';

/**
 * Subscribes to live record-sync events from the mobile app.
 *
 * - `version` increments on every matching event → key a counter element with
 *   it so the "pop" CSS animation replays when new data arrives.
 * - `newRowId` is the id of the newly synced record → rows matching it get the
 *   slide-in animation once.
 */
export const useLiveRecords = (sources: RecordEventSource[]) => {
  const { lastRecordEvent } = useSocket();
  const [version, setVersion] = useState(0);
  const [newRowId, setNewRowId] = useState<string | null>(null);
  const sourcesKey = sources.join(',');

  useEffect(() => {
    const event = lastRecordEvent;
    if (!event) return;
    if (!event.recordId || !sourcesKey.split(',').includes(event.source)) return;

    setVersion((v) => v + 1);
    setNewRowId((prev) => (prev === event.recordId ? prev : event.recordId));
  }, [lastRecordEvent, sourcesKey]);

  const clearRowId = () => setNewRowId(null);

  return { version, newRowId, clearRowId };
};
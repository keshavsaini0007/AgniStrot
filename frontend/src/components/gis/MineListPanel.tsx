import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { MapMarker } from '@/types';

interface MarkerListPanelProps {
  markers: MapMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const MarkerListPanel = ({ markers, selectedId, onSelect }: MarkerListPanelProps) => (
  <Card>
    <CardHeader>
      <h3 className="text-lg font-semibold text-[#F4F5F5]">Field Signals</h3>
    </CardHeader>
    <CardContent className="p-0 max-h-[600px] overflow-y-auto">
      {markers.length === 0 && <p className="p-4 text-sm text-[#8D969B]">No markers available.</p>}
      <div className="divide-y divide-[#252A2D]">
        {markers.map((marker) => (
          <div
            key={marker.id}
            className={`px-4 py-3 hover:bg-[#171A1D] transition-colors cursor-pointer ${
              selectedId === marker.id ? 'bg-[#171A1D]' : ''
            }`}
            onClick={() => onSelect(marker.id)}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#F4F5F5]">{marker.title}</p>
                <p className="text-xs text-[#8D969B]">{marker.siteName ?? marker.siteId}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {marker.severity && <Badge status={marker.severity} />}
                <span className="text-[10px] capitalize text-[#8D969B]">{marker.category}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { Card } from '@/components/ui/Card';
import type { MapMarker, RiskLayer } from '@/types';

interface MineMapProps {
  markers: MapMarker[];
  riskLayers?: RiskLayer[];
  onMarkerClick: (id: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#FF4058',
  high: '#FF4D4F',
  medium: '#F5B942',
};

/** Heat-gradient band colors — the "color key" for the risk heatmap. */
const BAND_COLORS: Record<RiskLayer['riskLevel'], string> = {
  LOW: '#35C759',
  MEDIUM: '#F5B942',
  HIGH: '#FF8C00',
  CRITICAL: '#FF4058',
};

const BAND_ORDER: RiskLayer['riskLevel'][] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const markerIcon = (severity?: string) =>
  divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:9999px;border:2px solid #fff;background:${
      SEVERITY_COLORS[severity ?? ''] ?? '#35C759'
    };box-shadow:0 0 8px rgba(0,0,0,0.6);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const siteIcon = (band: RiskLayer['riskLevel']) =>
  divIcon({
    className: '',
    html: `<div data-testid="risk-marker-${band}" style="width:24px;height:24px;border-radius:9999px;border:3px solid #fff;background:${
      BAND_COLORS[band]
    };box-shadow:0 0 10px ${BAND_COLORS[band]}AA;outline:2px solid #00000033;"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const RiskBadge = ({ band }: { band: RiskLayer['riskLevel'] }) => (
  <span
    data-testid="risk-band-badge"
    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
    style={{ background: `${BAND_COLORS[band]}22`, color: BAND_COLORS[band] }}
  >
    <span className="h-2 w-2 rounded-full" style={{ background: BAND_COLORS[band] }} />
    {band}
  </span>
);

export const MineMap = ({ markers, riskLayers = [], onMarkerClick }: MineMapProps) => {
  const layerBySite = new Map(riskLayers.map((l) => [l.siteId, l]));

  const renderPopup = (marker: MapMarker) => {
    const layer = marker.category === 'site' ? layerBySite.get(marker.siteId) : undefined;
    if (!layer) {
      return (
        <div className="text-center">
          <p className="font-medium">{marker.title}</p>
          <p className="text-sm text-gray-500">{marker.siteName ?? marker.siteId}</p>
          <p className="text-xs capitalize">{marker.category}</p>
        </div>
      );
    }
    const contributors = layer.topContributors.filter((c) => c.points !== 0).slice(0, 3);
    return (
      <div className="min-w-[220px] space-y-2" data-testid="risk-popup">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium text-[#1D2428]">{layer.siteName}</p>
          <RiskBadge band={layer.riskLevel} />
        </div>
        <p className="text-xs text-gray-500">{layer.subsidiary}</p>
        <p className="text-sm font-semibold text-[#1D2428]">
          Risk score{' '}
          <span className="text-base" data-testid="risk-popup-score">
            {layer.score}
          </span>
          <span className="text-xs font-normal text-gray-500"> / 100</span>
        </p>
        {contributors.length > 0 && (
          <ul className="space-y-1 text-xs text-gray-600">
            {contributors.map((c) => (
              <li key={c.key} className="flex justify-between gap-3">
                <span className="truncate">{c.label}</span>
                <span className="shrink-0 font-medium" style={{ color: c.points < 0 ? '#35C759' : BAND_COLORS.HIGH }}>
                  {c.points < 0 ? '' : '+'}
                  {c.points}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="border-t border-gray-200 pt-1.5 text-[11px] text-gray-500">
          {layer.metrics.unresolvedAlerts} unresolved alerts · {layer.metrics.failedInspections} failed inspections ·{' '}
          {layer.metrics.openHazards} open hazards
        </p>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="h-[600px]">
        <MapContainer
          center={[23.5, 85.5]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map((marker) => {
            const layer = marker.category === 'site' ? layerBySite.get(marker.siteId) : undefined;
            return (
              <Marker
                key={marker.id}
                position={[marker.lat, marker.lng]}
                icon={layer ? siteIcon(layer.riskLevel) : markerIcon(marker.severity)}
                zIndexOffset={layer ? 1000 : 0}
                eventHandlers={{
                  click: () => onMarkerClick(marker.id),
                }}
              >
                <Popup>{renderPopup(marker)}</Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-[#252A2D] px-4 py-2.5" data-testid="risk-legend">
        <span className="text-xs font-medium text-[#8D969B]">Risk heatmap:</span>
        {BAND_ORDER.map((band) => (
          <span key={band} className="inline-flex items-center gap-1.5 text-xs text-[#F4F5F5]">
            <span className="h-3 w-3 rounded-full" style={{ background: BAND_COLORS[band] }} />
            {band}
          </span>
        ))}
      </div>
    </Card>
  );
};
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { Card } from '@/components/ui/Card';
import type { MapMarker } from '@/types';

interface MineMapProps {
  markers: MapMarker[];
  onMarkerClick: (id: string) => void;
}

const markerIcon = (severity?: string) =>
  divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:9999px;border:2px solid #fff;background:${
      severity === 'critical'
        ? '#FF4058'
        : severity === 'high'
        ? '#FF4D4F'
        : severity === 'medium'
        ? '#F5B942'
        : '#35C759'
    };box-shadow:0 0 8px rgba(0,0,0,0.6);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

export const MineMap = ({ markers, onMarkerClick }: MineMapProps) => (
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
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={markerIcon(marker.severity)}
            eventHandlers={{
              click: () => onMarkerClick(marker.id),
            }}
          >
            <Popup>
              <div className="text-center">
                <p className="font-medium">{marker.title}</p>
                <p className="text-sm text-gray-500">{marker.siteName ?? marker.siteId}</p>
                <p className="text-xs capitalize">{marker.category}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  </Card>
);
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Card } from '@/components/ui/Card';
import type { Mine } from '@/types';

interface MineMapProps {
  mines: Mine[];
  onMineClick: (id: string) => void;
}

export const MineMap = ({ mines, onMineClick }: MineMapProps) => (
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
        {mines.map((mine) => (
          <Marker
            key={mine.id}
            position={[mine.location.latitude, mine.location.longitude]}
            eventHandlers={{
              click: () => onMineClick(mine.id),
            }}
          >
            <Popup>
              <div className="text-center">
                <p className="font-medium">{mine.name}</p>
                <p className="text-sm text-gray-500">{mine.code}</p>
                <p className="text-sm">Risk Score: {mine.riskScore}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  </Card>
);

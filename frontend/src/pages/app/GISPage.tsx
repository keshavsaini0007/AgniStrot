import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useMines } from '@/hooks/useMines';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import 'leaflet/dist/leaflet.css';

export const GISPage = () => {
  const { data: minesData, isLoading, error, refetch } = useMines({ limit: 50 });
  const [selectedMine, setSelectedMine] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return <ErrorState onRetry={refetch} />;
  }

  const mines = minesData?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F4F5F5]">GIS Intelligence</h1>
        <p className="text-[#8D969B]">Mine locations and risk visualization</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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
                      click: () => setSelectedMine(mine.id),
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
        </div>

        <div>
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-[#F4F5F5]">Mine List</h3>
            </CardHeader>
            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
              <div className="divide-y divide-[#252A2D]">
                {mines.map((mine) => (
                  <div
                    key={mine.id}
                    className={`px-4 py-3 hover:bg-[#171A1D] transition-colors cursor-pointer ${
                      selectedMine === mine.id ? 'bg-[#171A1D]' : ''
                    }`}
                    onClick={() => setSelectedMine(mine.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#F4F5F5]">{mine.name}</p>
                        <p className="text-xs text-[#8D969B]">{mine.code}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          mine.riskScore >= 70
                            ? 'text-[#FF4D4F]'
                            : mine.riskScore >= 40
                            ? 'text-[#F5B942]'
                            : 'text-[#35C759]'
                        }`}>
                          {mine.riskScore}
                        </p>
                        <Badge status={mine.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
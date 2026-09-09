import { useState } from 'react';
import { useMapMarkers } from '@/hooks/useMapMarkers';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { MineMap } from '@/components/gis/MineMap';
import { MarkerListPanel } from '@/components/gis/MineListPanel';
import 'leaflet/dist/leaflet.css';
import gisHeaderImg from '../../../assets/images/GIS.png';

export const GISPage = () => {
  const { data: markers, isLoading, error, refetch } = useMapMarkers();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="GIS Intelligence"
          subtitle="Incident and inspection-failure markers"
          backgroundImage={gisHeaderImg}
        />
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return <ErrorState onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="GIS Intelligence"
        subtitle="Live field markers from incidents and inspection failures"
        backgroundImage={gisHeaderImg}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MineMap markers={markers ?? []} onMarkerClick={setSelectedId} />
        </div>

        <div>
          <MarkerListPanel
            markers={markers ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </div>
    </div>
  );
};
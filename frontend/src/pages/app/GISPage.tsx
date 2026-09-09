import { useState } from 'react';
import { useMines } from '@/hooks/useMines';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { MineMap } from '@/components/gis/MineMap';
import { MineListPanel } from '@/components/gis/MineListPanel';
import 'leaflet/dist/leaflet.css';
import gisHeaderImg from '../../../assets/images/GIS.png';

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
      <PageHeader
        title="GIS Intelligence"
        subtitle="Mine locations and risk visualization"
        backgroundImage={gisHeaderImg}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MineMap mines={mines} onMineClick={setSelectedMine} />
        </div>

        <div>
          <MineListPanel
            mines={mines}
            selectedMine={selectedMine}
            onSelectMine={setSelectedMine}
          />
        </div>
      </div>
    </div>
  );
};

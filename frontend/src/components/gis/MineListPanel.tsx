import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Mine } from '@/types';

interface MineListPanelProps {
  mines: Mine[];
  selectedMine: string | null;
  onSelectMine: (id: string) => void;
}

export const MineListPanel = ({ mines, selectedMine, onSelectMine }: MineListPanelProps) => (
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
            onClick={() => onSelectMine(mine.id)}
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
);

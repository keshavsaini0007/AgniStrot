interface TrendPoint {
  date: string;
  value: number;
}

interface ComplianceTrendChartProps {
  data: TrendPoint[];
  color?: string;
  height?: string;
}

export const ComplianceTrendChart = ({ data, color = 'bg-[#D88A32]', height = 'h-40' }: ComplianceTrendChartProps) => (
  <div className={`flex items-end justify-between ${height}`}>
    {data.map((point) => (
      <div key={point.date} className="flex flex-col items-center gap-2 flex-1">
        <div className={`w-full max-w-[60px] ${color} rounded-t`} style={{ height: `${point.value}%` }} />
        <span className="text-xs text-[#8D969B]">
          {new Date(point.date).toLocaleDateString('en-IN', { month: 'short' })}
        </span>
        <span className="text-xs text-[#A4ADB2]">{point.value}%</span>
      </div>
    ))}
  </div>
);

interface ComplianceCategory {
  category: string;
  rate: number;
}

interface ComplianceOverviewProps {
  overall: number;
  byCategory: ComplianceCategory[];
}

export const ComplianceOverview = ({ overall, byCategory }: ComplianceOverviewProps) => (
  <>
    <div className="text-center mb-6">
      <p className="text-4xl font-bold text-[#35C759]">{overall}%</p>
      <p className="text-sm text-[#8D969B]">Overall Compliance</p>
    </div>
    <div className="space-y-3">
      {byCategory.map((cat) => (
        <div key={cat.category} className="flex items-center justify-between">
          <span className="text-sm text-[#A4ADB2]">{cat.category}</span>
          <div className="flex items-center gap-2">
            <div className="w-24 bg-[#252A2D] rounded-full h-2">
              <div
                className="h-2 rounded-full bg-[#35C759]"
                style={{ width: `${cat.rate}%` }}
              />
            </div>
            <span className="text-sm text-[#A4ADB2]">{cat.rate}%</span>
          </div>
        </div>
      ))}
    </div>
  </>
);

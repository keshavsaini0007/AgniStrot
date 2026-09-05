import { useState } from 'react';
import { FileBarChart, Download, Calendar } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';

const reportTypes = [
  { value: 'compliance', label: 'Compliance Report' },
  { value: 'inspections', label: 'Inspection Report' },
  { value: 'violations', label: 'Violation Report' },
  { value: 'risk', label: 'Risk Assessment Report' },
];

export const ReportsPage = () => {
  const [reportType, setReportType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleGenerate = () => {
    // TODO: Implement report generation
    console.log('Generating report:', { reportType, startDate, endDate });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F4F5F5]">Reports</h1>
        <p className="text-[#8D969B]">Generate and download reports</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Generate Report</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Report Type"
              options={reportTypes}
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              placeholder="Select report type"
            />
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              leftIcon={<Calendar className="w-4 h-4" />}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              leftIcon={<Calendar className="w-4 h-4" />}
            />
            <Button
              variant="primary"
              className="w-full"
              onClick={handleGenerate}
              disabled={!reportType}
            >
              Generate Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#F4F5F5]">Recent Reports</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#252A2D]">
              {[
                { name: 'Compliance Report - August 2026', date: '2026-08-31' },
                { name: 'Inspection Summary - Q3 2026', date: '2026-09-01' },
                { name: 'Risk Assessment - September 2026', date: '2026-09-02' },
              ].map((report, index) => (
                <div key={index} className="px-6 py-4 hover:bg-[#171A1D] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#D88A32]/10 flex items-center justify-center">
                      <FileBarChart className="w-5 h-5 text-[#D88A32]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#F4F5F5]">{report.name}</p>
                      <p className="text-xs text-[#8D969B]">{report.date}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
import { Plus, FileText, Download, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/utils/date';

const mockDocuments = [
  {
    id: 'doc-001',
    name: 'Safety Training Certificate 2026',
    category: 'Certificate',
    mineId: 'mine-001',
    fileType: 'application/pdf',
    fileSize: 245000,
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'doc-002',
    name: 'Environmental Clearance',
    category: 'Clearance',
    mineId: 'mine-001',
    fileType: 'application/pdf',
    fileSize: 180000,
    createdAt: '2026-01-20T14:00:00.000Z',
  },
  {
    id: 'doc-003',
    name: 'Inspection Report - August 2026',
    category: 'Report',
    mineId: 'mine-001',
    fileType: 'application/pdf',
    fileSize: 320000,
    createdAt: '2026-08-28T17:00:00.000Z',
  },
];

export const DocumentsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F4F5F5]">Documents</h1>
          <p className="text-[#8D969B]">Manage compliance documents</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Upload Document
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {mockDocuments.length === 0 ? (
            <EmptyState
              title="No documents"
              description="Upload your first document to get started."
            />
          ) : (
            <div className="divide-y divide-[#252A2D]">
              {mockDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="px-6 py-4 hover:bg-[#171A1D] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#4DA3FF]/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#4DA3FF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#F4F5F5] truncate">
                        {doc.name}
                      </p>
                      <p className="text-xs text-[#8D969B]">
                        {doc.category} • {(doc.fileSize / 1000).toFixed(0)} KB • {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4 text-[#FF4D4F]" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
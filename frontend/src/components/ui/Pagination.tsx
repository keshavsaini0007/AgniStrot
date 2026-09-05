import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ page, totalPages, onPageChange }: PaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#252A2D]">
      <div className="text-sm text-[#8D969B]">
        Page {page} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Previous
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
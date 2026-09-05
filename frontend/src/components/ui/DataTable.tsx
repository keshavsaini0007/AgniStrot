import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
}: DataTableProps<T>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#252A2D]">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-xs font-medium text-[#8D969B] uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:text-[#A4ADB2]' : ''
                } ${column.className || ''}`}
                onClick={() => column.sortable && onSort?.(column.key)}
              >
                <div className="flex items-center gap-2">
                  {column.header}
                  {column.sortable && sortBy === column.key && (
                    sortOrder === 'asc' ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#252A2D]">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="animate-pulse">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3">
                    <div className="h-4 bg-[#171A1D] rounded w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-[#8D969B]">
                No data available
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <motion.tr
                key={item.id || index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`hover:bg-[#171A1D] transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 text-sm text-[#F4F5F5] ${column.className || ''}`}>
                    {column.render ? column.render(item) : item[column.key]}
                  </td>
                ))}
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
import type { ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
}

export const FilterBar = ({ children }: FilterBarProps) => (
  <div className="flex flex-col sm:flex-row gap-4">
    {children}
  </div>
);

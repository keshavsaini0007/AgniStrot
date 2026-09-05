import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState = ({
  title = 'No data found',
  description = 'There are no items to display.',
  icon,
  action,
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-full bg-[#171A1D] flex items-center justify-center mb-4">
        {icon || <Inbox className="w-8 h-8 text-[#8D969B]" />}
      </div>
      <h3 className="text-lg font-medium text-[#F4F5F5] mb-2">{title}</h3>
      <p className="text-sm text-[#8D969B] text-center max-w-md mb-6">{description}</p>
      {action}
    </div>
  );
};
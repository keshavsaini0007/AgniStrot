import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState = ({
  title = 'Something went wrong',
  message = 'An error occurred while loading the data.',
  onRetry,
}: ErrorStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-full bg-[#FF4D4F]/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-[#FF4D4F]" />
      </div>
      <h3 className="text-lg font-medium text-[#F4F5F5] mb-2">{title}</h3>
      <p className="text-sm text-[#8D969B] text-center max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};
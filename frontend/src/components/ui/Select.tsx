import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#A4ADB2] mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`w-full bg-[#171A1D] border border-[#252A2D] rounded-lg px-4 py-2.5 text-[#F4F5F5] focus:outline-none focus:ring-2 focus:ring-[#D88A32]/50 focus:border-[#D88A32] transition-colors appearance-none ${
              error ? 'border-[#FF4D4F]' : ''
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" className="text-[#8D969B]">
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8D969B] pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1 text-sm text-[#FF4D4F]">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
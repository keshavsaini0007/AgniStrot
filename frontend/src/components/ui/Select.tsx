import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  compact?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, compact, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className={`block text-sm font-medium text-[#A4ADB2] ${compact ? 'mb-1' : 'mb-2'}`}>
            {label}
          </label>
        )}
        <div className="group relative">
          <select
            ref={ref}
            className={`w-full appearance-none rounded-xl border border-[#315064] bg-[#111F29]/70 pr-11 text-sm font-medium text-[#E8F0F3] shadow-[0_8px_24px_rgba(4,12,18,0.16)] outline-none transition-all duration-200 hover:border-[#527A91] hover:bg-[#172A36]/80 focus:border-[#D88A32] focus:ring-2 focus:ring-[#D88A32]/25 disabled:cursor-not-allowed disabled:opacity-50 ${compact ? 'px-3.5 py-2' : 'px-4 py-2.5'} ${
              error ? 'border-[#FF4D4F]' : ''
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" className="bg-[#111F29] text-[#8D969B]">
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} className="bg-[#111F29] text-[#E8F0F3]">
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-0 top-0 flex h-full w-10 items-center justify-center border-l border-[#315064]/80 text-[#D88A32] transition-colors group-hover:text-[#F5B942]">
            <ChevronDown className="h-4 w-4" />
          </span>
        </div>
        {error && (
          <p className="mt-1 text-sm text-[#FF4D4F]">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
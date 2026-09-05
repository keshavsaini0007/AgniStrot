import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#A4ADB2] mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D969B]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-[#171A1D] border border-[#252A2D] rounded-lg px-4 py-2.5 text-[#F4F5F5] placeholder-[#8D969B] focus:outline-none focus:ring-2 focus:ring-[#D88A32]/50 focus:border-[#D88A32] transition-colors ${
              leftIcon ? 'pl-10' : ''
            } ${error ? 'border-[#FF4D4F]' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-[#FF4D4F]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
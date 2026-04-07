import { cn } from '@/utils/cn';
import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-gray-700">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)] focus:border-transparent',
            'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
            error && 'border-red-400 focus:ring-red-400',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;

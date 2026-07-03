import { cn } from '@/utils/cn';
import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  children: ReactNode;
}

const VARIANTS = {
  primary: 'bg-[hsl(142,93%,8%)] text-white hover:bg-[hsl(142,93%,15%)] disabled:opacity-50',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:opacity-50',
  outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50',
  destructive: 'bg-red-500 text-white hover:bg-red-600 disabled:opacity-50',
  icon: 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-9 px-4 text-sm rounded-lg',
  lg: 'h-11 px-6 text-sm rounded-xl',
  icon: 'h-9 w-9 p-0 rounded-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={loading || disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)] focus:ring-offset-2',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  );
}

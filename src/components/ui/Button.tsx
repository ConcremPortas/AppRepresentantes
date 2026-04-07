import { cn } from '@/utils/cn';
import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const VARIANTS = {
  primary: 'bg-[hsl(142,93%,8%)] text-white hover:bg-[hsl(142,93%,15%)] disabled:opacity-50',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:opacity-50',
  outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50',
  destructive: 'bg-red-500 text-white hover:bg-red-600 disabled:opacity-50',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-9 px-4 text-sm rounded-lg',
  lg: 'h-11 px-6 text-sm rounded-xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
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
      {children}
    </button>
  );
}

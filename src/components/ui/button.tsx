'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-sky-600 text-white shadow-md shadow-sky-600/20 hover:bg-sky-700 active:bg-sky-800',
        primary:
          'bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 active:bg-blue-800',
        destructive:
          'bg-rose-600 text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 active:bg-rose-800',
        outline:
          'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900',
        secondary:
          'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300',
        ghost:
          'hover:bg-slate-100 hover:text-slate-900 shadow-none',
        link:
          'text-sky-600 underline-offset-4 hover:underline shadow-none',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-[11px] rounded-lg',
        md: 'h-9 px-4 text-xs rounded-lg',
        lg: 'h-11 px-6 text-sm rounded-xl',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isPending?: boolean;
  isLoading?: boolean;
  loadingText?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isPending,
      isLoading,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const pending = Boolean(isPending ?? isLoading);

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || pending}
        aria-busy={pending}
        {...props}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>{loadingText || (typeof children === 'string' ? `${children}...` : 'Loading...')}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

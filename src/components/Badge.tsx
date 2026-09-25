'use client';

import React from 'react';
import { cn } from '../lib/utils';

export type BadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'default'
  | 'neutral'
  | 'custom'
  | string;

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: BadgeVariant;
  customColor?: string | null;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  customColor,
  className,
  style,
  ...props
}) => {
  const variantStyles: Record<string, string> = {
    primary: 'bg-sky-100 text-sky-800 border border-sky-200',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
    danger: 'bg-rose-100 text-rose-800 border border-rose-200',
    info: 'bg-sky-100 text-sky-800 border border-sky-200',
    purple: 'bg-purple-100 text-purple-800 border border-purple-200',
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  const isCustomColor = Boolean(
    customColor && /^#[0-9A-Fa-f]{6}$/.test(customColor.trim())
  );

  const customStyle: React.CSSProperties = isCustomColor
    ? {
        backgroundColor: `${customColor}1a`,
        color: customColor || undefined,
        borderColor: `${customColor}40`,
        ...style,
      }
    : style || {};

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide',
        !isCustomColor && (variantStyles[variant] || variantStyles.neutral),
        isCustomColor && 'border font-medium',
        className
      )}
      style={customStyle}
      {...props}
    >
      {children}
    </span>
  );
};


'use client';

import React from 'react';
import { cn } from '../lib/utils';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
}

export function Tabs<T extends string>({ tabs, activeTab, onChange, className }: TabsProps<T>) {
  return (
    <div className={cn('flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-150 border-b-2 whitespace-nowrap cursor-pointer',
              isActive
                ? 'border-sky-600 text-sky-700 bg-sky-50/80 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            )}
          >
            {tab.icon && <span className={cn(isActive ? 'text-sky-600' : 'text-slate-400')}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-bold',
                  isActive ? 'bg-sky-200 text-sky-900' : 'bg-slate-200 text-slate-600'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

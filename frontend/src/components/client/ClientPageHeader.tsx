import { ReactNode } from 'react';

interface ClientPageHeaderProps {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  sticky?: boolean;
}

export default function ClientPageHeader({
  title,
  subtitle,
  rightSlot,
  actions,
  children,
  sticky = true
}: ClientPageHeaderProps) {
  return (
    <div className={sticky ? 'sticky top-0 z-20' : ''}>
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-4 space-y-4 shadow-sm">
        <div className="flex items-start justify-between space-x-4">
          <div>
            {subtitle && (
              <p className="text-[11px] uppercase tracking-wide text-gray-400">{subtitle}</p>
            )}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          </div>
          {rightSlot && (
            <div className="text-right text-sm text-gray-500 dark:text-gray-400">
              {rightSlot}
            </div>
          )}
        </div>

        {(actions || children) && (
          <div className="space-y-3">
            {actions && (
              <div className="flex items-center justify-end space-x-2 flex-wrap gap-y-2">
                {actions}
              </div>
            )}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

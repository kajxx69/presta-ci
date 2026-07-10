import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({ className, variant = 'text', width, height, count = 1 }: SkeletonProps) {
  const baseClass = clsx(
    'animate-shimmer bg-gray-200 dark:bg-gray-700',
    'bg-[linear-gradient(110deg,transparent_0%,transparent_35%,rgba(255,255,255,0.6)_50%,transparent_65%,transparent_100%)]',
    'dark:bg-[linear-gradient(110deg,transparent_0%,transparent_35%,rgba(255,255,255,0.08)_50%,transparent_65%,transparent_100%)]',
    'bg-[length:200%_100%]'
  );

  const variantClass = {
    text: 'rounded-md h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  }[variant];

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (count > 1) {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={clsx(baseClass, variantClass, className)}
            style={{ ...style, width: i === count - 1 ? '60%' : style.width }}
          />
        ))}
      </div>
    );
  }

  return <div className={clsx(baseClass, variantClass, className)} style={style} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
      <Skeleton variant="rounded" className="w-full h-40" />
      <Skeleton className="w-3/4 h-5" />
      <Skeleton className="w-1/2 h-4" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-16 h-8" variant="rounded" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <Skeleton variant="circular" className="w-12 h-12 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-3/4 h-4" />
            <Skeleton className="w-1/2 h-3" />
          </div>
          <Skeleton className="w-16 h-8" variant="rounded" />
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-2">
          <Skeleton variant="circular" className="w-10 h-10" />
          <Skeleton className="w-16 h-6" />
          <Skeleton className="w-full h-3" />
        </div>
      ))}
    </div>
  );
}

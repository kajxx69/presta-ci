import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({ children, className, onClick, hoverable = false, padding = 'md' }: CardProps) {
  const Component = onClick || hoverable ? motion.div : 'div';

  const baseProps = {
    className: clsx(
      'bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-soft',
      hoverable && 'cursor-pointer card-lift',
      onClick && 'cursor-pointer',
      paddingStyles[padding],
      className,
    ),
    onClick,
  };

  if (onClick || hoverable) {
    return (
      <Component
        {...baseProps}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </Component>
    );
  }

  return <div {...baseProps}>{children}</div>;
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('flex items-center justify-between mb-3', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={clsx('font-semibold text-gray-900 dark:text-white', className)}>{children}</h3>;
}

import { motion } from 'framer-motion';

interface SuccessCheckProps {
  size?: number;
  className?: string;
}

/** Cercle qui se dessine puis check qui rebondit — feedback de succès plus vivant qu'un simple fade. */
export function SuccessCheck({ size = 64, className }: SuccessCheckProps) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 ${className || ''}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="absolute inset-0">
        <motion.circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-emerald-500 dark:text-emerald-400"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </svg>
      <motion.svg
        viewBox="0 0 24 24"
        width={size * 0.45}
        height={size * 0.45}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-emerald-600 dark:text-emerald-400"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 500, damping: 15 }}
      >
        <polyline points="20 6 9 17 4 12" />
      </motion.svg>
    </div>
  );
}

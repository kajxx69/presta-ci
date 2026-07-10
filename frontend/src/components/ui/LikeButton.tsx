import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { clsx } from 'clsx';

interface LikeButtonProps {
  liked: boolean;
  count: number;
  onToggle: () => void;
  className?: string;
}

const BURST_ANGLES = [-40, -14, 14, 40, 65, -65];

/** Bouton "like" façon réseau social : pop du cœur + burst de particules au moment où on aime. */
export function LikeButton({ liked, count, onToggle, className }: LikeButtonProps) {
  const [burstKey, setBurstKey] = useState(0);

  const handleClick = () => {
    if (!liked) setBurstKey(k => k + 1);
    onToggle();
  };

  return (
    <button
      onClick={handleClick}
      className={clsx(
        'relative flex items-center space-x-2 transition-colors',
        liked ? 'text-red-500' : 'text-gray-600 dark:text-gray-400 hover:text-red-500',
        className
      )}
    >
      <span className="relative inline-flex">
        <motion.span
          key={liked ? 'liked' : 'unliked'}
          initial={{ scale: liked ? 0.6 : 1 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 12 }}
          className="inline-flex"
        >
          <Heart className={clsx('w-5 h-5', liked && 'fill-red-500')} />
        </motion.span>

        <AnimatePresence>
          {burstKey > 0 && (
            <motion.span
              key={burstKey}
              className="absolute inset-0 pointer-events-none"
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              {BURST_ANGLES.map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const distance = 16 + (i % 2) * 4;
                return (
                  <motion.span
                    key={i}
                    className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full bg-red-400"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.sin(rad) * distance,
                      y: -Math.cos(rad) * distance,
                      opacity: 0,
                      scale: 0.4,
                    }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                );
              })}
            </motion.span>
          )}
        </AnimatePresence>
      </span>

      <motion.span
        key={count}
        initial={{ y: liked ? 6 : -6, opacity: 0.4 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="text-sm"
      >
        {count}
      </motion.span>
    </button>
  );
}

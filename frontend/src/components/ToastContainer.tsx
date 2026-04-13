import { useAppStore } from '../store/appStore';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

const toastStyles = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-800 dark:text-emerald-200',
    icon: 'text-emerald-600 dark:text-emerald-400',
    Icon: CheckCircle,
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: 'text-red-600 dark:text-red-400',
    Icon: XCircle,
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: 'text-blue-600 dark:text-blue-400',
    Icon: Info,
  },
} as const;

export default function ToastContainer() {
  const { toasts, removeToast } = useAppStore();

  return (
    <div className="fixed top-16 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const style = toastStyles[toast.type as keyof typeof toastStyles] || toastStyles.info;
          const IconComp = style.Icon;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={clsx(
                'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm min-w-[280px] max-w-sm',
                style.bg,
              )}
            >
              <IconComp className={clsx('w-5 h-5 flex-shrink-0', style.icon)} />
              <p className={clsx('flex-1 text-sm font-medium', style.text)}>
                {toast.message}
              </p>
              <button
                onClick={() => removeToast(toast.id)}
                className={clsx('flex-shrink-0 p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors', style.icon)}
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

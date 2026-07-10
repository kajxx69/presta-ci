import { useState, useEffect, useRef } from 'react';
import { Bell, Moon, Sun, ArrowLeftRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationCenter from './NotificationCenter';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Logo from './Logo';

export default function Header() {
  const { isDarkMode, toggleDarkMode, setCurrentTab } = useAppStore();
  const { user, role, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const fetchUnread = async () => {
      try {
        const { count } = await api.notifications.getUnreadCount();
        setUnreadCount(count);
      } catch {
        // Silencieux : échec réseau transitoire (ex: cold start backend) — le
        // prochain polling (30s) rattrapera le compteur, pas la peine d'alerter.
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const isPro = location.pathname.startsWith('/pro');

  return (
    <header className="sticky top-0 z-50 glass border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm">
      <div className="flex items-center justify-between max-w-lg lg:max-w-none mx-auto px-4 h-14">
        {/* Logo - hidden on desktop (shown in sidebar) */}
        <button
          onClick={() => navigate('/app')}
          className="flex items-center gap-2 active:scale-95 transition-transform lg:hidden"
        >
          <Logo className="h-9 w-auto" />
        </button>
        <div className="hidden lg:block" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Pro/Client switch for prestataires */}
          {role?.id === 2 && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(isPro ? '/app' : '/pro')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                isPro
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{isPro ? 'Client' : 'Pro'}</span>
            </motion.button>
          )}

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowNotifications(prev => !prev)}
              className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-x-4 top-16 sm:absolute sm:right-0 sm:left-auto sm:inset-x-auto sm:mt-2 w-auto sm:w-[22rem] z-50"
                >
                  <NotificationCenter
                    onClose={() => setShowNotifications(false)}
                    onUnreadCountChange={setUnreadCount}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dark mode toggle */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleDarkMode}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isDarkMode ? 'dark' : 'light'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.button>

          {/* Avatar */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentTab('profile')}
            className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-blue-500/50 transition-all duration-200 shadow-sm flex-shrink-0"
          >
            {user?.photo_profil ? (
              <img
                src={user.photo_profil}
                alt={`${user.prenom} ${user.nom}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                {user?.prenom?.[0]}{user?.nom?.[0]}
              </div>
            )}
          </motion.button>
        </div>
      </div>
    </header>
  );
}

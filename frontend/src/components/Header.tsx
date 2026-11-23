import { useState, useEffect, useRef } from 'react';
import { Bell, LayoutDashboard, MessageCircle, Settings } from 'lucide-react';
import MenuReglages from './common/MenuReglages';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationCenter from './NotificationCenter';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Logo from './Logo';

export default function Header() {
  const { setCurrentTab, adminDansApp, setAdminDansApp } = useAppStore();
  const [reglages, setReglages] = useState(false);
  const [messagesNonLus, setMessagesNonLus] = useState(0);
  const { user, role, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
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
        api.conversations.getUnreadCount().then((r) => setMessagesNonLus(r.count)).catch(() => {});
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

  return (
    <header className="sticky top-0 z-50 glass border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm">
      <div className="flex items-center justify-between max-w-lg lg:max-w-none mx-auto px-4 h-14">
        {/* Logo - hidden on desktop (shown in sidebar) */}
        <button
          onClick={() => navigate('/app')}
          className="flex items-center gap-2 active:scale-95 transition-transform lg:hidden"
        >
          <Logo className="h-9 w-9 rounded-full" />
          <span className={`text-xl font-extrabold tracking-tight text-[#7A1638] dark:text-pink-300 ${role?.nom === 'admin' && adminDansApp ? 'hidden sm:inline' : ''}`}>Chicly</span>
        </button>
        <div className="hidden lg:block" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Admin en visite dans l'app : retour au back office */}
          {role?.nom === 'admin' && adminDansApp && (
            <button
              type="button"
              onClick={() => { setAdminDansApp(false); navigate('/app'); }}
              className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-[#7A1638] text-white text-xs font-semibold shadow-sm"
              title="Retour au back office"
            >
              <LayoutDashboard className="w-4 h-4" />
              Back office
            </button>
          )}

          {/* Messages */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/app/messages')}
            aria-label="Messages"
            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            {messagesNonLus > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {messagesNonLus > 9 ? '9+' : messagesNonLus}
              </span>
            )}
          </motion.button>

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

          {/* Réglages : modifier le profil, mode sombre, déconnexion */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setReglages(true)}
            aria-label="Réglages et déconnexion"
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
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
              <div className="w-full h-full bg-gradient-to-br from-[#7A1638] to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                {user?.prenom?.[0]}{user?.nom?.[0]}
              </div>
            )}
          </motion.button>
        </div>
      </div>
      <MenuReglages ouvert={reglages} onFermer={() => setReglages(false)} />
    </header>
  );
}

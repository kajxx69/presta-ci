import { useState, useEffect, useRef } from 'react';
import { Bell, LayoutDashboard, MessageCircle, Settings } from 'lucide-react';
import MenuReglages from './common/MenuReglages';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationCenter from './NotificationCenter';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Header() {
  const { adminDansApp, setAdminDansApp } = useAppStore();
  const [reglages, setReglages] = useState(false);
  const [messagesNonLus, setMessagesNonLus] = useState(0);
  const { role, isAuthenticated } = useAuthStore();
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
    <header className="sticky top-0 z-50 bg-creme dark:bg-gray-950">
      <div className="flex items-center justify-between max-w-lg lg:max-w-none mx-auto px-5 h-14">
        {/* Logotype texte (maquette) — caché sur ordinateur (déjà dans la barre latérale) */}
        <button onClick={() => navigate('/app')} className="lg:hidden text-[26px] font-bold tracking-tight text-encre dark:text-white leading-none" aria-label="Chicly — accueil">
          Chicly<span className="text-vin-600">.</span>
        </button>
        <div className="hidden lg:block" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Admin en visite dans l'app : retour au back office */}
          {role?.nom === 'admin' && adminDansApp && (
            <button
              type="button"
              onClick={() => { setAdminDansApp(false); navigate('/app'); }}
              className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-encre text-white text-xs font-semibold"
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
            <MessageCircle className="w-[22px] h-[22px] text-encre dark:text-gray-200" strokeWidth={1.7} />
            {messagesNonLus > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-vin-600 text-white text-[9px] font-bold flex items-center justify-center">
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
              <Bell className="w-[22px] h-[22px] text-encre dark:text-gray-200" strokeWidth={1.7} />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-0.5 right-0.5 bg-vin-600 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1"
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
            <Settings className="w-[22px] h-[22px] text-encre dark:text-gray-200" strokeWidth={1.7} />
          </motion.button>

        </div>
      </div>
      <MenuReglages ouvert={reglages} onFermer={() => setReglages(false)} />
    </header>
  );
}

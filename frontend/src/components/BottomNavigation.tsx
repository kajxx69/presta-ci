import { Home, Calendar, Camera, Heart, User, Package, CreditCard, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';

interface BottomNavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

const clientTabs = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'reservations', label: 'Réservations', icon: Calendar },
  { id: 'publications', label: 'Publications', icon: Camera },
  { id: 'favorites', label: 'Favoris', icon: Heart },
  { id: 'profile', label: 'Profil', icon: User },
];

const prestataireTabs = [
  { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'services', label: 'Services', icon: Package },
  { id: 'reservations', label: 'Réservations', icon: Calendar },
  { id: 'plans', label: 'Abonnement', icon: CreditCard },
  { id: 'profile', label: 'Profil', icon: User },
];

const adminTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Utilisateurs', icon: User },
  { id: 'services', label: 'Services', icon: Package },
  { id: 'payments', label: 'Paiements', icon: CreditCard },
  { id: 'profile', label: 'Profil', icon: User },
];

export default function BottomNavigation({ currentTab, setCurrentTab }: BottomNavigationProps) {
  const { role, isAuthenticated } = useAuthStore();
  const { showToast } = useAppStore();
  const navigate = useNavigate();

  const handleTabSelect = (tabId: string) => {
    setCurrentTab(tabId);
  };

  let tabs = clientTabs;
  if (role?.nom === 'prestataire') tabs = prestataireTabs;
  if (role?.nom === 'admin') tabs = adminTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-gray-200/50 dark:border-gray-700/50 safe-bottom lg:hidden">
      <div className="max-w-lg mx-auto px-2">
        <div className="flex justify-around items-center h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.85 }}
                onClick={() => handleTabSelect(tab.id)}
                className="relative flex flex-col items-center justify-center w-full py-1 gap-0.5"
              >
                <div className="relative">
                  <motion.div
                    animate={{
                      y: isActive ? -2 : 0,
                      scale: isActive ? 1.1 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors duration-200 ${
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </motion.div>

                  {/* Active indicator dot */}
                  <AnimatedDot visible={isActive} />
                </div>

                <span
                  className={`text-[10px] font-medium transition-colors duration-200 ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function AnimatedDot({ visible }: { visible: boolean }) {
  return (
    <motion.div
      initial={false}
      animate={{
        scale: visible ? 1 : 0,
        opacity: visible ? 1 : 0,
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400"
    />
  );
}

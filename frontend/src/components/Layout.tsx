import { useAppStore } from '../store/appStore';
import Header from './Header';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import SidebarNavigation from './SidebarNavigation';

interface LayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

export default function Layout({ children, showBottomNav = true }: LayoutProps) {
  const { isDarkMode, currentTab, setCurrentTab } = useAppStore();
  const location = useLocation();

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
        <div className="flex">
          {/* Sidebar - desktop only */}
          {showBottomNav && (
            <SidebarNavigation currentTab={currentTab} setCurrentTab={setCurrentTab} />
          )}

          {/* Main content area */}
          <div className="flex-1 min-w-0">
            <Header />

            <AnimatePresence mode="wait">
              <motion.main
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={showBottomNav ? 'pb-20 lg:pb-6' : ''}
              >
                {children}
              </motion.main>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

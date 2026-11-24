import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import { api } from './lib/api';
import { swipesLocaux } from './lib/swipesLocaux';
import { notificationService } from './services/notifications';
import ToastContainer from './components/ToastContainer';

// ─── Lazy: Auth (léger, chargé uniquement si non connecté) ───
const EcranAuth = lazy(() => import('./components/auth/EcranAuth'));
const CGUPage = lazy(() => import('./components/legal/CGUPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));

// ─── Lazy: Layout shell (chargé dès qu'on est client/prestataire) ───
const Layout = lazy(() => import('./components/Layout'));
const BottomNavigation = lazy(() => import('./components/BottomNavigation'));

// ─── Lazy: Client ───
const DiscoverTab = lazy(() => import('./components/client/DiscoverTab'));
const SearchTab = lazy(() => import('./components/client/SearchTab'));
const ClientProfileHub = lazy(() => import('./components/client/ClientProfileHub'));

// ─── Lazy: Pages détail (accessibles par tous) ───
const PrestataireDetailPage = lazy(() => import('./pages/PrestataireDetailPage'));
const ServiceDetailPage = lazy(() => import('./pages/ServiceDetailPage'));

// ─── Lazy: Messagerie (client & prestataire) ───

// ─── Lazy: Prestataire ───

// ─── Lazy: Admin (chargé UNIQUEMENT si admin) ───
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));

// ─── Loading fallback ───
// Écran de chargement Chicly : identique à celui d'index.html (aucun saut visuel)
function EcranChicly() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#F9F6F2]">
      <img src="/chicly-splash.png" alt="Chicly" className="w-[min(72vw,360px)] h-auto animate-[chicly-pulse_1.6s_ease-in-out_infinite]" />
    </div>
  );
}

function LoadingFallback() {
  return <EcranChicly />;
}

function SplashScreen() {
  return <EcranChicly />;
}

// ─── Role-based tab renderers ───

// Un seul type de compte : tout le monde a Découvrir · Recherche · Profil.
// On devient pro en proposant un modèle (« Je sais le faire ») ; l'espace pro
// (Demandes reçues, Mes prestations, Abonnement, Tableau de bord) vit alors dans le Profil.
function AppTabRenderer({ currentTab, setCurrentTab, estPro }: {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  estPro: boolean;
}) {
  switch (currentTab) {
    case 'search': return <SearchTab />;
    case 'profile':
    case 'favorites': return <ClientProfileHub onglet="enregistres" onNavigateToTab={setCurrentTab} />; // ancien onglet Favoris
    case 'mes-reservations': return <ClientProfileHub onglet="reservations" onNavigateToTab={setCurrentTab} />;
    // « reservations » : réservations reçues pour une pro (liens des notifications), sinon les siennes
    case 'reservations': return <ClientProfileHub onglet={estPro ? 'demandes' : 'reservations'} onNavigateToTab={setCurrentTab} />;
    case 'demandes': return <ClientProfileHub onglet={estPro ? 'demandes' : 'reservations'} onNavigateToTab={setCurrentTab} />;
    case 'messages': return <ClientProfileHub onglet="messages" onNavigateToTab={setCurrentTab} />;
    case 'compte': return <ClientProfileHub onglet="compte" onNavigateToTab={setCurrentTab} />;
    case 'devenir-pro': return <ClientProfileHub onglet="devenir-pro" onNavigateToTab={setCurrentTab} />;
    case 'dashboard':
    case 'services':
    case 'plans': return estPro ? <ClientProfileHub onglet={currentTab} onNavigateToTab={setCurrentTab} /> : <DiscoverTab />;
    default: return <DiscoverTab />; // home, publications (ancien lien)…
  }
}

// Onglets valides par rôle (protège contre les URLs /app/nimportequoi)
const VALID_TABS = new Set(['home', 'search', 'compte', 'reservations', 'mes-reservations', 'demandes', 'publications', 'messages', 'favorites', 'profile', 'services', 'plans', 'dashboard', 'devenir-pro']);

/** Shell principal : synchronise l'onglet courant avec l'URL /app/:tab (deep-linking + bouton retour) */
function AppShell() {
  const { isAuthenticated, role } = useAuthStore();
  const { currentTab, setCurrentTab, adminDansApp } = useAppStore();
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  // L'URL est la seule source de vérité pour l'onglet courant : une synchronisation
  // bidirectionnelle URL↔store crée une course au montage d'un deep-link
  // (/app/messages) où le store écrase l'URL demandée et fait churner la clé
  // d'AnimatePresence en plein montage → contenu figé à opacity 0 (page "vide").
  const urlTab = tab && VALID_TABS.has(tab) ? tab : null;
  const activeTab = urlTab ?? currentTab;

  // Le store suit l'URL (pour les composants hors AppShell qui lisent currentTab)
  useEffect(() => {
    if (urlTab && urlTab !== currentTab) setCurrentTab(urlTab);
  }, [urlTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // URL sans onglet valide (/app, ou setCurrentTab+navigate('/app') depuis une
  // page détail) : matérialiser l'onglet du store dans l'URL
  useEffect(() => {
    if (!urlTab && currentTab) navigate(`/app/${currentTab}`, { replace: true });
  }, [urlTab, currentTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Changer d'onglet = naviguer (l'effet ci-dessus aligne ensuite le store)
  const handleTabChange = useCallback((t: string) => {
    setCurrentTab(t);
    if (VALID_TABS.has(t)) navigate(`/app/${t}`);
  }, [navigate, setCurrentTab]);

  // Favoris swipés avant connexion → rattachés au compte de la cliente
  useEffect(() => {
    if (!isAuthenticated || role?.nom === 'admin') return;
    const { likes, passes } = swipesLocaux.lire();
    if (!likes.length && !passes.length) return;
    api.modeles.sync({ likes, passes })
      .then(() => { swipesLocaux.vider(); window.dispatchEvent(new Event('prestaci-favoris-sync')); })
      .catch(() => {});
  }, [isAuthenticated, role]);

  const estAdmin = isAuthenticated && role?.nom === 'admin';
  if (estAdmin && !adminDansApp) {
    return (
      <div className={useAppStore.getState().isDarkMode ? 'dark' : ''}>
        <AdminPanel />
        <ToastContainer />
      </div>
    );
  }

  const renderCurrentTab = () => (
    // Les visiteurs non connectés naviguent comme tout le monde
    <AppTabRenderer currentTab={activeTab} setCurrentTab={handleTabChange} estPro={isAuthenticated && role?.nom === 'prestataire'} />
  );

  return (
    <>
      <Layout>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {renderCurrentTab()}
          </motion.div>
        </AnimatePresence>
        <BottomNavigation currentTab={activeTab} setCurrentTab={handleTabChange} />
      </Layout>
    </>
  );
}

function App() {
  const { isAuthenticated } = useAuthStore();

  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const auth = JSON.parse(localStorage.getItem('prestaci-auth') || '{}');
        if (!auth.token) {
          useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
          setAuthReady(true);
          return;
        }

        const { user } = await api.auth.me();
        let role = null as null | { id: number; nom: string; description: string; created_at: string };
        if (user?.role_id) {
          const roleName = user.role_nom || (user.role_id === 1 ? 'client' : user.role_id === 2 ? 'prestataire' : user.role_id === 3 ? 'admin' : '');
          role = { id: user.role_id, nom: roleName, description: '', created_at: '' };
        }
        useAuthStore.setState({ user, role, isAuthenticated: true });

        if (user) {
          await notificationService.initialize();
        }
      } catch {
        localStorage.removeItem('prestaci-auth');
        useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
      } finally {
        setAuthReady(true);
      }
    })();

    const savedDarkMode = localStorage.getItem('prestaci-dark-mode');
    if (savedDarkMode) {
      const darkMode = JSON.parse(savedDarkMode);
      useAppStore.setState({ isDarkMode: darkMode });
      document.documentElement.classList.toggle('dark', darkMode);
    }

    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js')
        .catch(error => console.log('Service Worker registration failed:', error));
    }
  }, []);

  if (!authReady) {
    return <SplashScreen />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />

        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/app" replace />
            ) : (
              <EcranAuth mode="connexion" />
            )
          }
        />

        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/app" replace />
            ) : (
              <EcranAuth mode="inscription" />
            )
          }
        />

        <Route path="/app/:tab?" element={<AppShell />} />

        <Route path="/pro" element={<Navigate to="/app/profile" replace />} />

        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/conditions" element={<div className="min-h-screen bg-creme dark:bg-gray-950"><CGUPage onBack={() => window.history.back()} /></div>} />
        <Route path="/reset-password" element={<ForgotPasswordPage />} />

        <Route path="/prestataires/:id" element={<PrestataireDetailPage />} />
        <Route path="/services/:id" element={<ServiceDetailPage />} />

        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
      <ToastContainer />
    </Suspense>
  );
}

export default App;

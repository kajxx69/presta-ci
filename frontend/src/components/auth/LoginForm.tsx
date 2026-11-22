import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { PanneauMarque, EnTeteMobile } from './AuthDecor';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState('');

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Oups, e-mail ou mot de passe incorrect. Réessaie 🙏🏾');
      } else {
        navigate('/app', { replace: true });
      }
    } catch {
      setError('Impossible de se connecter. Vérifie ta connexion internet et réessaie.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex min-h-screen sm:min-h-0 sm:rounded-3xl overflow-hidden sm:shadow-soft-lg sm:ring-1 ring-gray-900/[0.06] dark:ring-white/[0.08] min-h-[560px]">
      <PanneauMarque accroche="Ton prochain style t'attend 💖" sousTitre="Swipe des coiffures, ongles et looks, puis réserve chez les meilleures d'Abidjan." />
      {/* Right panel — form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1 bg-white dark:bg-gray-900 p-6 sm:p-10 flex flex-col justify-center"
      >
        <EnTeteMobile titre="Re-coucou ! 👋🏾" sousTitre="Tes coups de cœur t'attendent" />

        <div className="mb-8 hidden lg:block">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-gray-900 dark:text-white"
          >
            Re-coucou ! 👋🏾
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-gray-500 dark:text-gray-400 mt-1"
          >
            Connecte-toi pour retrouver tes coups de cœur et tes réservations
          </motion.p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email
            </label>
            <div className={`relative rounded-2xl border-2 transition-all duration-200 ${
              focused === 'email' ? 'border-pink-400 shadow-lg shadow-pink-500/10' : 'border-gray-200 dark:border-gray-600'
            }`}>
              <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                focused === 'email' ? 'text-pink-500' : 'text-gray-400'
              }`} />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused('')}
                className="w-full pl-11 pr-4 py-3.5 bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 text-sm"
                placeholder="ton@email.com"
                autoComplete="email"
                required
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mot de passe
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs text-pink-600 dark:text-pink-400 hover:text-pink-700 font-medium"
              >
                Oublié ?
              </button>
            </div>
            <div className={`relative rounded-2xl border-2 transition-all duration-200 ${
              focused === 'password' ? 'border-pink-400 shadow-lg shadow-pink-500/10' : 'border-gray-200 dark:border-gray-600'
            }`}>
              <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                focused === 'password' ? 'text-pink-500' : 'text-gray-400'
              }`} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused('')}
                className="w-full pl-11 pr-12 py-3.5 bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 text-sm"
                placeholder="Ton mot de passe"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
              >
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 disabled:opacity-60 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-pink-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connexion...
              </>
            ) : (
              <>
                C'est parti
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Nouvelle ici ?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-pink-600 dark:text-pink-400 font-semibold hover:underline"
            >
              Crée ton compte gratuit ✨
            </button>
          </p>
        </motion.div>

      </motion.div>
    </div>
  );
}

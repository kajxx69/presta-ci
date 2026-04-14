import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle, ArrowRight, Star, Shield, Zap, MapPin } from 'lucide-react';
import Logo from '../Logo';

const features = [
  { icon: MapPin, title: 'Trouvez des pros près de chez vous', desc: 'Coiffure, beauté, ménage, plomberie...' },
  { icon: Star, title: 'Avis vérifiés', desc: 'Consultez les notes et commentaires' },
  { icon: Shield, title: 'Réservation sécurisée', desc: 'Payez en toute confiance' },
  { icon: Zap, title: 'Rapide & simple', desc: 'Réservez en quelques clics' },
];

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
        setError('Email ou mot de passe incorrect');
      } else {
        navigate('/app', { replace: true });
      }
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex rounded-3xl overflow-hidden shadow-2xl min-h-[560px]">
      {/* Left panel — desktop only */}
      <div className="hidden lg:flex lg:w-5/12 relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-10 flex-col justify-between overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-32 -right-20 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Logo className="h-8 w-auto" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">PrestaCI</span>
          </div>
          <p className="text-blue-100 text-sm mt-1">La marketplace de services en Côte d'Ivoire</p>
        </motion.div>

        <div className="relative z-10 space-y-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
              className="flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{f.title}</p>
                <p className="text-blue-200 text-xs">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="relative z-10"
        >
          <p className="text-blue-200 text-xs">
            Rejoignez + de 500 utilisateurs en Côte d'Ivoire
          </p>
        </motion.div>
      </div>

      {/* Right panel — form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1 bg-white dark:bg-gray-800 p-8 sm:p-10 flex flex-col justify-center"
      >
        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-3">
            <Logo className="h-10 w-auto" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">PrestaCI</h1>
        </div>

        <div className="mb-8">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-gray-900 dark:text-white"
          >
            Bon retour !
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-gray-500 dark:text-gray-400 mt-1"
          >
            Connectez-vous pour continuer
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
            <div className={`relative rounded-xl border-2 transition-all duration-200 ${
              focused === 'email' ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-gray-200 dark:border-gray-600'
            }`}>
              <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                focused === 'email' ? 'text-blue-500' : 'text-gray-400'
              }`} />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused('')}
                className="w-full pl-11 pr-4 py-3.5 bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 text-sm"
                placeholder="votre@email.com"
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
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
              >
                Oublié ?
              </button>
            </div>
            <div className={`relative rounded-xl border-2 transition-all duration-200 ${
              focused === 'password' ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-gray-200 dark:border-gray-600'
            }`}>
              <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                focused === 'password' ? 'text-blue-500' : 'text-gray-400'
              }`} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused('')}
                className="w-full pl-11 pr-12 py-3.5 bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 text-sm"
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
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
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connexion...
              </>
            ) : (
              <>
                Se connecter
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
            Pas encore de compte ?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Créer un compte gratuitement
            </button>
          </p>
        </motion.div>

        {/* Mobile features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="lg:hidden mt-8 pt-6 border-t border-gray-100 dark:border-gray-700"
        >
          <div className="grid grid-cols-2 gap-3">
            {features.map(f => (
              <div key={f.title} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <f.icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>{f.title}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

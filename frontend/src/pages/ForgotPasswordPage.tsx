import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { api } from '../lib/api';
import Logo from '../components/Logo';

// ── Étape 1 : saisie de l'email ──────────────────────────────────────────────
function ForgotStep() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.auth.forgotPassword(email);
      if (res.reset_token) {
        setResetToken(res.reset_token);
      }
    } catch (e: any) {
      setError(e.message?.includes('HTTP') ? 'Erreur serveur. Réessayez.' : e.message);
    } finally {
      setLoading(false);
    }
  };

  if (resetToken) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-5"
      >
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Lien généré !</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe.
          </p>
        </div>
        <button
          onClick={() => navigate(`/reset-password?token=${resetToken}`)}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
        >
          Réinitialiser mon mot de passe →
        </button>
        <p className="text-xs text-gray-400">Ce lien expire dans 1 heure.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mot de passe oublié ?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Saisissez votre email pour recevoir un lien de réinitialisation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fp-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Adresse email
          </label>
          <div className="relative rounded-xl border-2 border-gray-200 dark:border-gray-600 focus-within:border-blue-500 transition-colors">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="fp-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="w-full pl-11 pr-4 py-3.5 bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 text-sm"
            />
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold disabled:opacity-60 hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
          {loading ? 'Envoi...' : 'Envoyer le lien'}
        </button>
      </form>
    </motion.div>
  );
}

// ── Étape 2 : saisie du nouveau mot de passe ─────────────────────────────────
function ResetStep() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.auth.resetPassword(token, password);
      setSuccess(true);
    } catch (e: any) {
      const msg = e.message || '';
      setError(msg.includes('HTTP 400') ? 'Lien invalide ou expiré. Refaites une demande.' : 'Erreur serveur. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <p className="text-gray-600 dark:text-gray-400">Lien invalide.</p>
        <button onClick={() => navigate('/forgot-password')} className="text-blue-600 font-medium hover:underline">
          Faire une nouvelle demande
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-5"
      >
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mot de passe modifié !</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
        >
          Se connecter
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nouveau mot de passe</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choisissez un mot de passe sécurisé.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Nouveau mot de passe
          </label>
          <div className="relative rounded-xl border-2 border-gray-200 dark:border-gray-600 focus-within:border-blue-500 transition-colors">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              required
              className="w-full pl-11 pr-12 py-3.5 bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 text-sm"
            />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500">
              {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Confirmer le mot de passe
          </label>
          <div className="relative rounded-xl border-2 border-gray-200 dark:border-gray-600 focus-within:border-blue-500 transition-colors">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPwd ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Répétez le mot de passe"
              required
              className="w-full pl-11 pr-4 py-3.5 bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 text-sm"
            />
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading || !password || !confirm}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold disabled:opacity-60 hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
          {loading ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
        </button>
      </form>
    </motion.div>
  );
}

// ── Shell commun ──────────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReset = !!searchParams.get('token');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8">
          {/* Logo + back */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow">
                <Logo className="h-6 w-auto" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white">PrestaCI</span>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          </div>

          {isReset ? <ResetStep /> : <ForgotStep />}
        </div>
      </motion.div>
    </div>
  );
}

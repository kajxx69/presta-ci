import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, User, Phone, Loader2,
  AlertCircle, CheckCircle2, XCircle, ArrowRight, ArrowLeft,
  Sparkles
} from 'lucide-react';
import { PanneauMarque, EnTeteMobile } from './AuthDecor';
import { useOffreLancement } from '../../lib/offreLancement';

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Faible', color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Moyen', color: 'bg-orange-500' };
  if (score <= 3) return { score, label: 'Bon', color: 'bg-yellow-500' };
  return { score, label: 'Fort', color: 'bg-green-500' };
}

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('225')) {
    const local = digits.slice(3);
    const parts = local.match(/.{1,2}/g) || [];
    return '+225 ' + parts.join(' ');
  }
  const parts = digits.match(/.{1,2}/g) || [];
  return parts.join(' ');
}

// Un seul compte pour tout le monde : on devient pro en proposant un modèle
// (« Je sais le faire »), on est cliente quand on réserve.
const steps = [
  { id: 'identity', title: 'Tes infos' },
  { id: 'security', title: 'Ton mot de passe' },
];

export default function RegisterForm() {
  const [searchParams] = useSearchParams();
  // Arrivée depuis « Je suis coiffeuse » : on rappelle comment proposer ses modèles
  const vientPourPro = searchParams.get('role') === 'prestataire';

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nom: '',
    prenom: '',
    telephone: '',
    role_id: 1,
    nom_commercial: '',
    ville: '',
    adresse: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    code_parrain: '',
    photo_profil: '' as string
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState('');

  const { register } = useAuthStore();
  const placesOffre = useOffreLancement();
  const navigate = useNavigate();

  const currentSteps = steps;
  const totalSteps = currentSteps.length;

  const passwordStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);
  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const canGoNext = () => {
    const currentStepId = currentSteps[step]?.id;
    switch (currentStepId) {
      case 'identity': return formData.prenom.trim() && formData.nom.trim() && formData.email.includes('@') && formData.telephone.trim();
      case 'security': return formData.password.length >= 6 && passwordsMatch;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      await register(formData as any);
      navigate('/app', { replace: true });
    } catch (err: any) {
      if (err?.message?.includes('already') || err?.message?.includes('existe') || err?.message?.includes('duplicate') || err?.message?.includes('409')) {
        setError('Tu as déjà un compte avec cet e-mail. Connecte-toi 😉');
      } else {
        setError('Impossible de créer ton compte. Vérifie ta connexion et réessaie.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'telephone') {
      setFormData({ ...formData, telephone: formatPhoneNumber(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const nextStep = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else handleSubmit();
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const inputWrapperClass = (field: string) =>
    `relative rounded-2xl border-2 transition-all duration-200 ${
      focused === field ? 'border-pink-400 shadow-lg shadow-pink-500/10' : 'border-gray-200 dark:border-gray-600'
    }`;

  const inputClass = "w-full pl-11 pr-4 py-3.5 bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  const renderStep = () => {
    const currentStepId = currentSteps[step]?.id;

    switch (currentStepId) {
      case 'identity':
        return (
          <motion.div
            key="identity"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Prénom</label>
                <div className={inputWrapperClass('prenom')}>
                  <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    focused === 'prenom' ? 'text-pink-500' : 'text-gray-400'
                  }`} />
                  <input
                    type="text"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleChange}
                    onFocus={() => setFocused('prenom')}
                    onBlur={() => setFocused('')}
                    className={inputClass}
                    placeholder="Adjoua"
                    autoComplete="given-name"
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Nom</label>
                <div className={inputWrapperClass('nom')}>
                  <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    focused === 'nom' ? 'text-pink-500' : 'text-gray-400'
                  }`} />
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    onFocus={() => setFocused('nom')}
                    onBlur={() => setFocused('')}
                    className={inputClass}
                    placeholder="Kouadio"
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <div className={inputWrapperClass('email')}>
                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                  focused === 'email' ? 'text-pink-500' : 'text-gray-400'
                }`} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused('')}
                  className={inputClass}
                  placeholder="ton@email.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Téléphone</label>
              <div className={inputWrapperClass('telephone')}>
                <Phone className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                  focused === 'telephone' ? 'text-pink-500' : 'text-gray-400'
                }`} />
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  onFocus={() => setFocused('telephone')}
                  onBlur={() => setFocused('')}
                  className={inputClass}
                  placeholder="+225 07 08 09 10 11"
                  autoComplete="tel"
                  required
                />
              </div>
            </div>
          </motion.div>
        );

      case 'security':
        return (
          <motion.div
            key="security"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-4"
          >
            <div>
              <label className={labelClass}>Mot de passe</label>
              <div className={inputWrapperClass('password')}>
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                  focused === 'password' ? 'text-pink-500' : 'text-gray-400'
                }`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused('')}
                  className="w-full pl-11 pr-12 py-3.5 bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 text-sm"
                  placeholder="Min. 6 caractères"
                  autoComplete="new-password"
                  minLength={6}
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
              {formData.password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <motion.div
                        key={level}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: level <= passwordStrength.score ? 1 : 0.3 }}
                        className={`h-1.5 flex-1 rounded-full origin-left transition-all duration-300 ${
                          level <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${
                    passwordStrength.score <= 1 ? 'text-red-500' :
                    passwordStrength.score <= 2 ? 'text-orange-500' :
                    passwordStrength.score <= 3 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {passwordStrength.label}
                    {formData.password.length < 6 && ' — min. 6 caractères'}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Confirme ton mot de passe</label>
              <div className={`${inputWrapperClass('confirmPassword')} ${
                passwordsMismatch ? '!border-red-400' : passwordsMatch ? '!border-green-400' : ''
              }`}>
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                  focused === 'confirmPassword' ? 'text-pink-500' : 'text-gray-400'
                }`} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => setFocused('confirmPassword')}
                  onBlur={() => setFocused('')}
                  className="w-full pl-11 pr-12 py-3.5 bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 text-sm"
                  placeholder="Retape ton mot de passe"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.confirmPassword.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-1 flex items-center gap-1"
                >
                  {passwordsMatch ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      <p className="text-xs text-green-600 font-medium">Les mots de passe correspondent</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                      <p className="text-xs text-red-500 font-medium">Les mots de passe ne correspondent pas</p>
                    </>
                  )}
                </motion.div>
              )}
            </div>

            {/* Code de parrainage (optionnel) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Code de parrainage <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <input
                type="text"
                name="code_parrain"
                value={formData.code_parrain}
                onChange={handleChange}
                placeholder="Ex: AWA-3F2A1B"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none focus:border-pink-400 transition-colors placeholder:text-gray-400 uppercase"
              />
              <p className="text-xs text-gray-400 mt-1">Une amie t'a invitée ? Mets son code ici 🎁</p>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex min-h-screen sm:min-h-0 sm:rounded-3xl overflow-hidden sm:shadow-soft-lg sm:ring-1 ring-gray-900/[0.06] dark:ring-white/[0.08] min-h-[600px]">
      <PanneauMarque accroche="Rejoins le club beauté ✨" sousTitre="Gratuit, en 30 secondes. Swipe, garde tes coups de cœur, réserve." />

      {/* Right panel — form */}
      <div className="flex-1 bg-white dark:bg-gray-900 p-6 sm:p-8 flex flex-col">
        {step === 0 ? (
          <EnTeteMobile titre="Bienvenue ✨" sousTitre="Crée ton compte gratuit en 30 secondes" />
        ) : (
          <h1 className="lg:hidden text-xl font-extrabold text-gray-900 dark:text-white mb-4">Presque fini 💖</h1>
        )}

        {/* Coiffeuse, onglerie, make-up : même compte, on se propose ensuite sur les modèles */}
        {step === 0 && (
          <div className={`mb-5 rounded-2xl p-3 text-sm border ${vientPourPro ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700'} text-gray-700 dark:text-gray-200`}>
            ✂️ <strong>Tu es coiffeuse, onglerie ou make-up ?</strong> Crée ton compte ici, puis touche « Je sais le faire » sur un modèle : tu deviens pro en 1 minute.
            {placesOffre > 0 && <span className="block mt-1 font-semibold text-pink-600 dark:text-pink-400">🎁 1 mois Pro offert · plus que {placesOffre} place{placesOffre > 1 ? 's' : ''}</span>}
          </div>
        )}

        {/* Progress bar */}
        {(
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Étape {step + 1} sur {totalSteps}
              </span>
              <span className="text-xs font-medium text-pink-600 dark:text-pink-400">
                {currentSteps[step]?.title}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-pink-500 to-orange-400 rounded-full"
              />
            </div>
          </motion.div>
        )}

        {/* Step content */}
        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mt-4"
            >
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        {(
          <div className="flex gap-3 mt-6">
            {step > 0 && <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={prevStep}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </motion.button>}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={nextStep}
              disabled={!canGoNext() || isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 disabled:opacity-50 text-white font-semibold shadow-lg hover:shadow-xl transition-all text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Inscription...
                </>
              ) : step === totalSteps - 1 ? (
                <>
                  C'est parti !
                  <Sparkles className="w-4 h-4" />
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>
        )}

        {/* Switch to login */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Déjà un compte ?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-pink-600 dark:text-pink-400 font-semibold hover:underline"
            >
              Se connecter
            </button>
          </p>
        </motion.div>

      </div>
    </div>
  );
}

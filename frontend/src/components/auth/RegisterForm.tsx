import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, User, Phone, Briefcase, Loader2,
  AlertCircle, CheckCircle2, XCircle, ArrowRight, ArrowLeft,
  MapPin, Star, Shield, Zap, Sparkles
} from 'lucide-react';
import AddressMapPicker from '../common/AddressMapPicker';
import Logo from '../Logo';

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

const features = [
  { icon: MapPin, title: 'Services locaux', desc: 'Trouvez des pros partout en Côte d\'Ivoire' },
  { icon: Star, title: 'Avis vérifiés', desc: 'Des notes et commentaires authentiques' },
  { icon: Shield, title: '100% sécurisé', desc: 'Vos données sont protégées' },
  { icon: Zap, title: 'Simple & rapide', desc: 'Inscrivez-vous en 30 secondes' },
];

const steps = [
  { id: 'role', title: 'Type de compte' },
  { id: 'identity', title: 'Identité' },
  { id: 'security', title: 'Sécurité' },
];

const stepsPrestataire = [
  { id: 'role', title: 'Type de compte' },
  { id: 'business', title: 'Établissement' },
  { id: 'identity', title: 'Identité' },
  { id: 'security', title: 'Sécurité' },
];

export default function RegisterForm() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nom: '',
    prenom: '',
    telephone: '',
    role_id: 0,
    nom_commercial: '',
    ville: '',
    adresse: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    code_parrain: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState('');

  const { register } = useAuthStore();
  const navigate = useNavigate();

  const currentSteps = formData.role_id === 2 ? stepsPrestataire : steps;
  const totalSteps = currentSteps.length;

  const passwordStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);
  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const canGoNext = () => {
    const currentStepId = currentSteps[step]?.id;
    switch (currentStepId) {
      case 'role': return formData.role_id > 0;
      case 'business': return formData.nom_commercial.trim() && formData.ville.trim() && formData.adresse.trim();
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
        setError('Un compte existe déjà avec cet email. Essayez de vous connecter.');
      } else {
        setError('Impossible de créer le compte. Vérifiez votre connexion et réessayez.');
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

  const selectRole = (roleId: number) => {
    setFormData({ ...formData, role_id: roleId });
    // Auto advance after a short delay
    setTimeout(() => setStep(1), 300);
  };

  const inputWrapperClass = (field: string) =>
    `relative rounded-xl border-2 transition-all duration-200 ${
      focused === field ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-gray-200 dark:border-gray-600'
    }`;

  const inputClass = "w-full pl-11 pr-4 py-3.5 bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  const renderStep = () => {
    const currentStepId = currentSteps[step]?.id;

    switch (currentStepId) {
      case 'role':
        return (
          <motion.div
            key="role"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-5"
          >
            <div className="text-center mb-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-3"
              >
                <Sparkles className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </motion.div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Comment souhaitez-vous utiliser PrestaCI ?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choisissez votre type de compte</p>
            </div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectRole(1)}
              className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                formData.role_id === 1
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  formData.role_id === 1 ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <User className={`w-7 h-7 ${formData.role_id === 1 ? 'text-blue-600' : 'text-gray-500'}`} />
                </div>
                <div>
                  <p className={`font-bold text-lg ${formData.role_id === 1 ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                    Je cherche un service
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Réserver des prestations de coiffure, ménage, beauté...
                  </p>
                </div>
              </div>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectRole(2)}
              className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                formData.role_id === 2
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg shadow-purple-500/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  formData.role_id === 2 ? 'bg-purple-100 dark:bg-purple-800' : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <Briefcase className={`w-7 h-7 ${formData.role_id === 2 ? 'text-purple-600' : 'text-gray-500'}`} />
                </div>
                <div>
                  <p className={`font-bold text-lg ${formData.role_id === 2 ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-white'}`}>
                    Je propose mes services
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Publiez vos prestations et recevez des réservations
                  </p>
                </div>
              </div>
            </motion.button>
          </motion.div>
        );

      case 'business':
        return (
          <motion.div
            key="business"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-4"
          >
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                <strong>Votre établissement</strong> — ces informations seront visibles par les clients
              </p>
            </div>

            <div>
              <label className={labelClass}>Nom de l'établissement</label>
              <div className={inputWrapperClass('nom_commercial')}>
                <Briefcase className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                  focused === 'nom_commercial' ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <input
                  type="text"
                  name="nom_commercial"
                  value={formData.nom_commercial}
                  onChange={handleChange}
                  onFocus={() => setFocused('nom_commercial')}
                  onBlur={() => setFocused('')}
                  className={inputClass}
                  placeholder="Ex: Salon BelleVie, Studio Photo Adjamé..."
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Ville</label>
              <div className={inputWrapperClass('ville')}>
                <MapPin className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                  focused === 'ville' ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <input
                  type="text"
                  name="ville"
                  value={formData.ville}
                  onChange={handleChange}
                  onFocus={() => setFocused('ville')}
                  onBlur={() => setFocused('')}
                  className={inputClass}
                  placeholder="Abidjan, Yamoussoukro, Bouaké..."
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Adresse exacte</label>
              <AddressMapPicker
                value={formData.adresse}
                onChange={(address, lat, lng) => {
                  setFormData({ ...formData, adresse: address, latitude: lat, longitude: lng });
                }}
                placeholder="Cliquez pour localiser sur la carte"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Vos clients pourront vous trouver facilement
              </p>
            </div>
          </motion.div>
        );

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
                    focused === 'prenom' ? 'text-blue-500' : 'text-gray-400'
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
                    focused === 'nom' ? 'text-blue-500' : 'text-gray-400'
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
                  focused === 'email' ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused('')}
                  className={inputClass}
                  placeholder="votre@email.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Téléphone</label>
              <div className={inputWrapperClass('telephone')}>
                <Phone className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                  focused === 'telephone' ? 'text-blue-500' : 'text-gray-400'
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
                  focused === 'password' ? 'text-blue-500' : 'text-gray-400'
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
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
              <label className={labelClass}>Confirmer le mot de passe</label>
              <div className={`${inputWrapperClass('confirmPassword')} ${
                passwordsMismatch ? '!border-red-400' : passwordsMatch ? '!border-green-400' : ''
              }`}>
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                  focused === 'confirmPassword' ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => setFocused('confirmPassword')}
                  onBlur={() => setFocused('')}
                  className="w-full pl-11 pr-12 py-3.5 bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 text-sm"
                  placeholder="Retapez votre mot de passe"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
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
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400 uppercase"
              />
              <p className="text-xs text-gray-400 mt-1">Un ami vous a invité ? Entrez son code ici.</p>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex rounded-3xl overflow-hidden shadow-soft-lg ring-1 ring-gray-900/[0.06] dark:ring-white/[0.08] min-h-[600px]">
      {/* Left panel — desktop only */}
      <div className="hidden lg:flex lg:w-5/12 relative bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-10 flex-col justify-between overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />

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
          <p className="text-blue-100 text-sm mt-1">Créez votre compte en quelques secondes</p>
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
            Gratuit et sans engagement
          </p>
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 bg-white dark:bg-gray-800 p-6 sm:p-8 flex flex-col">
        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-2">
            <Logo className="h-9 w-auto" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Rejoignez PrestaCI</h1>
        </div>

        {/* Progress bar */}
        {step > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Étape {step + 1} sur {totalSteps}
              </span>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {currentSteps[step]?.title}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
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
        {step > 0 && (
          <div className="flex gap-3 mt-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={prevStep}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={nextStep}
              disabled={!canGoNext() || isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-semibold shadow-lg hover:shadow-xl transition-all text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Inscription...
                </>
              ) : step === totalSteps - 1 ? (
                <>
                  Créer mon compte
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
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Se connecter
            </button>
          </p>
        </motion.div>

        {/* Mobile features */}
        {step === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="lg:hidden mt-6 pt-5 border-t border-gray-100 dark:border-gray-700"
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
        )}
      </div>
    </div>
  );
}

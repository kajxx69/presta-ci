import { useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, User, Phone, Briefcase, Loader2,
  AlertCircle, CheckCircle2, XCircle, ArrowRight, ArrowLeft,
  MapPin, Sparkles, Camera, X
} from 'lucide-react';
import AddressMapPicker from '../common/AddressMapPicker';
import { PanneauMarque, EnTeteMobile } from './AuthDecor';
import { useOffreLancement } from '../../lib/offreLancement';

async function compressAvatar(file: File): Promise<string> {
  const dataUri: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUri;
  });
  const MAX = 640;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  if (scale === 1 && file.size < 300 * 1024) return dataUri;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

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

const steps = [
  { id: 'role', title: 'Toi' },
  { id: 'identity', title: 'Tes infos' },
  { id: 'security', title: 'Ton mot de passe' },
];

const stepsPrestataire = [
  { id: 'role', title: 'Toi' },
  { id: 'business', title: 'Ton salon' },
  { id: 'identity', title: 'Tes infos' },
  { id: 'security', title: 'Ton mot de passe' },
];

export default function RegisterForm() {
  const [searchParams] = useSearchParams();
  const prefillProRole = searchParams.get('role') === 'prestataire';

  const [step, setStep] = useState(prefillProRole ? 1 : 0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nom: '',
    prenom: '',
    telephone: '',
    role_id: prefillProRole ? 2 : 0,
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
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { register } = useAuthStore();
  const placesOffre = useOffreLancement();
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
      case 'business': return !!(formData.nom_commercial.trim() && formData.ville.trim() && formData.adresse.trim() && formData.photo_profil);
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

  const selectRole = (roleId: number) => {
    setFormData({ ...formData, role_id: roleId });
    // Auto advance after a short delay
    setTimeout(() => setStep(1), 300);
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
                className="hidden lg:flex w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-pink-500/20 to-orange-400/20 items-center justify-center mb-3"
              >
                <Sparkles className="w-7 h-7 text-pink-600 dark:text-pink-400" />
              </motion.div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tu es plutôt… ?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tu pourras toujours changer plus tard</p>
            </div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectRole(1)}
              className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                formData.role_id === 1
                  ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 shadow-lg shadow-pink-500/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-pink-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-gradient-to-br from-pink-100 to-rose-200 dark:from-pink-900/40 dark:to-rose-900/40">💖</div>
                <div>
                  <p className={`font-bold text-lg ${formData.role_id === 1 ? 'text-pink-700 dark:text-pink-300' : 'text-gray-900 dark:text-white'}`}>
                    Je cherche mon prochain style
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Je swipe des modèles et je réserve chez une pro
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
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-lg shadow-orange-500/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-900/40 dark:to-orange-900/40">✂️</div>
                <div>
                  <p className={`font-bold text-lg ${formData.role_id === 2 ? 'text-orange-700 dark:text-orange-300' : 'text-gray-900 dark:text-white'}`}>
                    Je suis coiffeuse ou esthéticienne
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Je propose mes modèles et je reçois des clientes
                  </p>
                  {placesOffre > 0 && (
                    <p className="mt-1.5 inline-block text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 text-white">
                      🎁 1 mois Pro offert · plus que {placesOffre} place{placesOffre > 1 ? 's' : ''}
                    </p>
                  )}
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
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <strong>Ton salon ✂️</strong> : c'est ce que verront tes futures clientes
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 py-2">
              <label className={labelClass}>Photo de profil *</label>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center group hover:border-orange-500 transition-colors"
              >
                {formData.photo_profil ? (
                  <img src={formData.photo_profil} alt="Aperçu" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-orange-400 group-hover:text-orange-600 transition-colors" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </button>
              {formData.photo_profil && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, photo_profil: '' }))}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Retirer
                </button>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setPhotoError('');
                  if (file.size > 5 * 1024 * 1024) {
                    setPhotoError('Image trop volumineuse (max 5MB)');
                    return;
                  }
                  try {
                    const compressed = await compressAvatar(file);
                    setFormData(prev => ({ ...prev, photo_profil: compressed }));
                  } catch {
                    setPhotoError('Impossible de charger cette image');
                  }
                }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
                Une jolie photo de toi ou de ton salon inspire confiance 📸
              </p>
              {photoError && <p className="text-xs text-red-500">{photoError}</p>}
            </div>

            <div>
              <label className={labelClass}>Nom de ton salon</label>
              <div className={inputWrapperClass('nom_commercial')}>
                <Briefcase className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                  focused === 'nom_commercial' ? 'text-pink-500' : 'text-gray-400'
                }`} />
                <input
                  type="text"
                  name="nom_commercial"
                  value={formData.nom_commercial}
                  onChange={handleChange}
                  onFocus={() => setFocused('nom_commercial')}
                  onBlur={() => setFocused('')}
                  className={inputClass}
                  placeholder="Ex : Awa Beauty, Nails by Mariam…"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Quartier / ville</label>
              <div className={inputWrapperClass('ville')}>
                <MapPin className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                  focused === 'ville' ? 'text-pink-500' : 'text-gray-400'
                }`} />
                <input
                  type="text"
                  name="ville"
                  value={formData.ville}
                  onChange={handleChange}
                  onFocus={() => setFocused('ville')}
                  onBlur={() => setFocused('')}
                  className={inputClass}
                  placeholder="Cocody, Yopougon, Marcory…"
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
                placeholder="Touche pour te placer sur la carte"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Tes clientes te trouveront facilement
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
          <h1 className="lg:hidden text-xl font-extrabold text-gray-900 dark:text-white mb-4">{formData.role_id === 2 ? 'Ton espace pro ✂️' : 'Presque fini 💖'}</h1>
        )}

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

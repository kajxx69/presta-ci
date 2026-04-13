import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Eye, EyeOff, Mail, Lock, User, Phone, Briefcase, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
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

const inputClass = "w-full pl-10 pr-4 py-3.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:shadow-md transition-all duration-200 placeholder:text-gray-400";
const inputClassNoIcon = "w-full px-4 py-3.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:shadow-md transition-all duration-200 placeholder:text-gray-400";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

export default function RegisterForm() {
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
    longitude: undefined as number | undefined
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { register } = useAuthStore();
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);
  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setIsLoading(false);
      return;
    }

    try {
      await register(formData as any);
      navigate('/app', { replace: true });
    } catch (err) {
      setError('Erreur lors de l\'inscription. Veuillez réessayer.');
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

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-2xl shadow-inner mb-4">
          <Logo className="h-14 w-auto" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Créer votre compte
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Rejoignez PrestaCI dès aujourd'hui
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type de compte */}
        <div>
          <label className={labelClass}>Type de compte</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role_id: 1 })}
              className={`p-4 rounded-2xl border transition-all duration-200 ${
                formData.role_id === 1
                  ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${
                  formData.role_id === 1 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <User className={`w-6 h-6 ${formData.role_id === 1 ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-300'}`} />
                </div>
                <div className="text-left">
                  <div className={`font-semibold ${formData.role_id === 1 ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>Client</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Réserver des prestations</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, role_id: 2 })}
              className={`p-4 rounded-2xl border transition-all duration-200 ${
                formData.role_id === 2
                  ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${
                  formData.role_id === 2 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <Briefcase className={`w-6 h-6 ${formData.role_id === 2 ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-300'}`} />
                </div>
                <div className="text-left">
                  <div className={`font-semibold ${formData.role_id === 2 ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>Prestataire</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Publier des services</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Champs prestataire */}
        {formData.role_id === 2 && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Informations essentielles</strong> — Vous pourrez compléter votre profil après l'inscription
              </p>
            </div>

            <div>
              <label htmlFor="reg-nom-commercial" className={labelClass}>
                Nom de votre établissement *
              </label>
              <input
                id="reg-nom-commercial"
                type="text"
                name="nom_commercial"
                value={formData.nom_commercial}
                onChange={handleChange}
                className={inputClassNoIcon}
                placeholder="Ex: Salon BelleVie, Studio Coiffure Adjamé..."
                required
              />
            </div>

            <div>
              <label htmlFor="reg-ville" className={labelClass}>Ville *</label>
              <input
                id="reg-ville"
                type="text"
                name="ville"
                value={formData.ville}
                onChange={handleChange}
                className={inputClassNoIcon}
                placeholder="Abidjan, Yamoussoukro, Bouaké..."
                required
              />
            </div>

            <div>
              <label className={labelClass}>Adresse complète *</label>
              <AddressMapPicker
                value={formData.adresse}
                onChange={(address, lat, lng) => {
                  setFormData({
                    ...formData,
                    adresse: address,
                    latitude: lat,
                    longitude: lng
                  });
                }}
                placeholder="Cliquez pour sélectionner sur la carte"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Cliquez sur le champ pour ouvrir la carte et sélectionner votre position exacte
              </p>
            </div>
          </div>
        )}

        {/* Nom & Prénom */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="reg-prenom" className={labelClass}>Prénom</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="reg-prenom"
                type="text"
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                className={inputClass}
                placeholder="Adjoua"
                autoComplete="given-name"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-nom" className={labelClass}>Nom</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="reg-nom"
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                className={inputClass}
                placeholder="Kouadio"
                autoComplete="family-name"
                required
              />
            </div>
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="reg-email" className={labelClass}>Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="reg-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={() => handleBlur('email')}
              className={`${inputClass} ${touched.email && !formData.email.includes('@') ? 'border-red-400 focus:ring-red-500' : ''}`}
              placeholder="votre@email.com"
              autoComplete="email"
              required
            />
          </div>
          {touched.email && formData.email.length > 0 && !formData.email.includes('@') && (
            <p className="mt-1 text-xs text-red-500">Veuillez entrer une adresse email valide</p>
          )}
        </div>

        {/* Téléphone */}
        <div>
          <label htmlFor="reg-telephone" className={labelClass}>Téléphone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="reg-telephone"
              type="tel"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              className={inputClass}
              placeholder="+225 07 08 09 10 11"
              autoComplete="tel"
              required
            />
          </div>
        </div>

        {/* Mot de passe */}
        <div>
          <label htmlFor="reg-password" className={labelClass}>Mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={() => handleBlur('password')}
              className={`${inputClass} pr-12`}
              placeholder="Min. 6 caractères"
              autoComplete="new-password"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {/* Indicateur de force */}
          {formData.password.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
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

        {/* Confirmer mot de passe */}
        <div>
          <label htmlFor="reg-confirm-password" className={labelClass}>Confirmer le mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="reg-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={() => handleBlur('confirmPassword')}
              className={`${inputClass} pr-12 ${
                passwordsMismatch && touched.confirmPassword
                  ? 'border-red-400 focus:ring-red-500'
                  : passwordsMatch
                  ? 'border-green-400 focus:ring-green-500'
                  : ''
              }`}
              placeholder="Retapez votre mot de passe"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
              aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {/* Feedback correspondance */}
          {formData.confirmPassword.length > 0 && (
            <div className="mt-1 flex items-center gap-1">
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
            </div>
          )}
        </div>

        {/* Erreur */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-xl shadow-sm animate-[fadeIn_0.3s_ease-in-out]">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Bouton inscription */}
        <button
          type="submit"
          disabled={isLoading || passwordsMismatch}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400 text-white py-3.5 px-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Inscription en cours...
            </>
          ) : (
            'S\'inscrire'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Déjà un compte ?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold hover:underline transition-all duration-200"
          >
            Se connecter
          </button>
        </p>
      </div>
    </div>
  );
}

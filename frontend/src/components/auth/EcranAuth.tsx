import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useOffreLancement } from '../../lib/offreLancement';

function formatTelephone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('225')) return '+225 ' + (digits.slice(3).match(/.{1,2}/g) || []).join(' ');
  return (digits.match(/.{1,2}/g) || []).join(' ');
}

const champ = 'w-full px-5 py-4 rounded-2xl bg-white dark:bg-gray-900 border border-ligne dark:border-gray-700 text-[17px] text-encre dark:text-white placeholder-gray-400 focus:outline-none focus:border-vin-400 transition-colors';

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-2 font-semibold text-encre dark:text-white">{label}</span>
      {children}
    </label>
  );
}

/** Écran unique Inscription / Connexion (maquette) : sobre, sans illustration. */
export default function EcranAuth({ mode }: { mode: 'inscription' | 'connexion' }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const vientPourPro = params.get('role') === 'prestataire';
  const { login, register } = useAuthStore();
  const placesOffre = useOffreLancement();
  const [f, setF] = useState({ prenom: '', nom: '', telephone: '', email: '', password: '' });
  const [voir, setVoir] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const maj = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: k === 'telephone' ? formatTelephone(e.target.value) : e.target.value });

  const inscription = mode === 'inscription';
  const valide = inscription
    ? f.prenom.trim() && f.nom.trim() && f.telephone.replace(/\D/g, '').length >= 8 && f.email.includes('@') && f.password.length >= 8
    : f.email.includes('@') && f.password.length > 0;

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valide || envoi) return;
    setEnvoi(true);
    setErreur('');
    try {
      if (inscription) {
        await register({ ...f, email: f.email.trim(), prenom: f.prenom.trim(), nom: f.nom.trim(), role_id: 1 } as any);
        navigate('/app', { replace: true });
      } else {
        const ok = await login(f.email.trim(), f.password);
        if (!ok) setErreur('E-mail ou mot de passe incorrect.');
        else navigate('/app', { replace: true });
      }
    } catch (err: any) {
      const m = String(err?.message || '');
      setErreur(inscription && /409|existe|already|duplicate|utilisé/i.test(m)
        ? 'Un compte existe déjà avec cet e-mail. Connecte-toi.'
        : inscription ? 'Impossible de créer ton compte. Vérifie ta connexion et réessaie.' : 'Impossible de se connecter. Vérifie ta connexion et réessaie.');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-creme dark:bg-gray-950">
      <div className="max-w-md mx-auto px-6 pt-10 pb-12">
        <button onClick={() => navigate('/app')} className="text-[28px] font-bold tracking-tight text-encre dark:text-white" aria-label="Chicly — accueil">
          Chicly<span className="text-vin-600">.</span>
        </button>

        <h1 className="mt-10 text-[34px] leading-[1.12] font-bold text-encre dark:text-white">
          {inscription ? 'Trouve ta prochaine coiffure, ton prochain style.' : 'Content de te revoir.'}
        </h1>
        <p className="mt-3 text-[17px] text-gray-500 dark:text-gray-400">
          {inscription
            ? vientPourPro ? 'Crée ton compte, puis propose tes modèles pour recevoir des clientes près de chez toi.'
              : 'Découvre des coiffures, ongles et make-up, garde tes coups de cœur et réserve près de chez toi.'
            : 'Connecte-toi pour retrouver tes modèles et tes réservations.'}
        </p>

        {/* Inscription / Connexion */}
        <div className="mt-8 grid grid-cols-2 p-1.5 rounded-full bg-sable dark:bg-gray-800" role="tablist">
          {(['inscription', 'connexion'] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m}
              onClick={() => mode !== m && navigate(m === 'inscription' ? `/register${params.toString() ? `?${params}` : ''}` : '/login', { replace: true })}
              className={`py-3 rounded-full text-[17px] transition-colors ${mode === m ? 'bg-white dark:bg-gray-900 text-encre dark:text-white font-semibold shadow-sm' : 'text-gray-600 dark:text-gray-400 font-medium'}`}>
              {m === 'inscription' ? 'Inscription' : 'Connexion'}
            </button>
          ))}
        </div>

        <form onSubmit={envoyer} className="mt-7 space-y-5">
          {inscription && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Champ label="Prénom"><input value={f.prenom} onChange={maj('prenom')} autoComplete="given-name" placeholder="Aminata" className={champ} /></Champ>
                <Champ label="Nom"><input value={f.nom} onChange={maj('nom')} autoComplete="family-name" placeholder="Koné" className={champ} /></Champ>
              </div>
              <Champ label="Téléphone"><input value={f.telephone} onChange={maj('telephone')} inputMode="tel" autoComplete="tel" placeholder="07 00 00 00 00" className={champ} /></Champ>
            </>
          )}
          <Champ label="E-mail"><input type="email" value={f.email} onChange={maj('email')} autoComplete="email" placeholder="toi@email.com" className={champ} /></Champ>
          <Champ label="Mot de passe">
            <div className="relative">
              <input type={voir ? 'text' : 'password'} value={f.password} onChange={maj('password')}
                autoComplete={inscription ? 'new-password' : 'current-password'}
                placeholder={inscription ? '8 caractères minimum' : 'Ton mot de passe'} className={`${champ} pr-14`} />
              <button type="button" onClick={() => setVoir((v) => !v)} aria-label={voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-500">
                {voir ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </Champ>
          {!inscription && (
            <div className="text-right -mt-2">
              <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm font-medium text-vin-600 dark:text-vin-300">Mot de passe oublié ?</button>
            </div>
          )}

          {erreur && <p role="alert" className="rounded-2xl bg-vin-50 dark:bg-vin-900/30 text-vin-800 dark:text-vin-200 px-4 py-3 text-[15px]">{erreur}</p>}

          <button type="submit" disabled={!valide || envoi}
            className="w-full py-4 rounded-full bg-vin-600 hover:bg-vin-700 text-white text-lg font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {envoi && <Loader2 className="w-5 h-5 animate-spin" />}
            {inscription ? 'Créer mon compte' : 'Me connecter'}
          </button>
        </form>

        {inscription && placesOffre > 0 && (
          <p className="mt-5 text-center text-sm text-gray-600 dark:text-gray-400">Tu es coiffeuse, onglerie ou maquilleuse ? 1 mois Pro offert aux {placesOffre} prochaines pros.</p>
        )}
        <p className="mt-6 text-center text-sm text-gray-500">
          En continuant, tu acceptes les <button onClick={() => navigate('/conditions')} className="underline">conditions d’utilisation</button>.
        </p>
        <p className="mt-2 text-center">
          <button onClick={() => navigate('/app')} className="text-sm font-medium text-gray-600 dark:text-gray-400">Continuer sans compte</button>
        </p>
      </div>
    </div>
  );
}

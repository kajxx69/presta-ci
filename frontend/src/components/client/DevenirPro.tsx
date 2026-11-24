import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useOffreLancement } from '../../lib/offreLancement';
import ChoixCommune from '../common/ChoixCommune';

const messageErreur = (e: any, defaut: string) => {
  try { return JSON.parse(String(e.message).replace(/^HTTP \d+: /, '')).error || defaut; } catch { return defaut; }
};

/** « Devenir prestataire » : crée l'espace pro en une étape (le même compte reste cliente). */
export default function DevenirPro({ onFait }: { onFait: () => void }) {
  const { user } = useAuthStore();
  const { showToast } = useAppStore();
  const placesOffre = useOffreLancement();
  const [salon, setSalon] = useState('');
  const [commune, setCommune] = useState<string | null>((user as any)?.commune || null);
  const [quartier, setQuartier] = useState('');
  const [tel, setTel] = useState((user as any)?.telephone || '');
  const [envoi, setEnvoi] = useState(false);

  const valider = async () => {
    if (salon.trim().length < 2) return showToast('Indique le nom de ton activité ou de ton salon', 'error');
    if (!commune) return showToast('Choisis ta commune', 'error');
    setEnvoi(true);
    try {
      const r = await api.prestataires.devenirPro({ nom_commercial: salon.trim(), commune, ville: commune, quartier: quartier.trim() || undefined, telephone_pro: tel.trim() || undefined });
      const role = { id: 2, nom: 'prestataire', description: '', created_at: '' };
      try { localStorage.setItem('prestaci-auth', JSON.stringify({ user: r.user, role, token: r.token })); } catch { /* stockage indisponible */ }
      useAuthStore.setState({ user: r.user, role: role as any, token: r.token, isAuthenticated: true });
      showToast('Ton espace pro est prêt. Ajoute ton premier modèle.', 'success');
      onFait();
    } catch (e) {
      showToast(messageErreur(e, "Impossible de créer ton espace pro"), 'error');
    } finally {
      setEnvoi(false);
    }
  };

  const champ = 'w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-ligne dark:border-gray-700 text-encre dark:text-white placeholder-gray-400 focus:outline-none focus:border-vin-400';
  return (
    <div className="max-w-lg mx-auto px-5 pt-4 pb-10 space-y-5">
      <p className="rounded-2xl bg-sable dark:bg-gray-800 px-4 py-3.5 text-[15px] text-gray-700 dark:text-gray-200">
        Ton compte reste le même : tu continues à réserver, et le menu <strong>Demandes</strong> apparaît dans ta barre de navigation pour recevoir des clientes.
        {placesOffre > 0 && <span className="block mt-1 text-vin-700 dark:text-vin-300 font-semibold">1 mois Pro offert · plus que {placesOffre} places</span>}
      </p>
      <label className="block">
        <span className="block mb-2 font-semibold text-encre dark:text-white">Nom de ton activité ou salon</span>
        <input value={salon} onChange={(e) => setSalon(e.target.value)} placeholder="Ex. Studio Awa" className={champ} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block mb-2 font-semibold text-encre dark:text-white">Commune</span>
          <ChoixCommune valeur={commune} onChange={setCommune} vide="Ta commune" className="[&_select]:py-3.5 [&_select]:rounded-2xl" />
        </label>
        <label className="block">
          <span className="block mb-2 font-semibold text-encre dark:text-white">Quartier</span>
          <input value={quartier} onChange={(e) => setQuartier(e.target.value)} placeholder="Ex. Angré" className={champ} />
        </label>
      </div>
      <label className="block">
        <span className="block mb-2 font-semibold text-encre dark:text-white">Téléphone</span>
        <input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" placeholder="07 00 00 00 00" className={champ} />
        <span className="block mt-1.5 text-sm text-gray-500">Partagé avec une cliente seulement quand tu confirmes son rendez-vous.</span>
      </label>
      <button onClick={valider} disabled={envoi}
        className="w-full py-4 rounded-full bg-vin-600 hover:bg-vin-700 text-white text-lg font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2">
        {envoi && <Loader2 className="w-5 h-5 animate-spin" />}Créer mon espace pro
      </button>
    </div>
  );
}

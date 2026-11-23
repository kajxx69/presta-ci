import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2, Scissors, Home } from 'lucide-react';
import { api, Modele } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import ModeleVisuel from './ModeleVisuel';
import { useOffreLancement } from '../../lib/offreLancement';
import ChoixCommune from '../common/ChoixCommune';
import { usePosition } from '../../lib/position';

interface Props {
  modele: Modele | null;
  onClose: () => void;
  /** Déjà proposé : prix/durée actuels pour pré-remplir (modification) */
  offreActuelle?: { prix: number; duree_minutes?: number | null; is_domicile?: boolean } | null;
  onFait?: () => void;
}

const DUREES = [
  { min: 60, label: '1 h' }, { min: 120, label: '2 h' }, { min: 180, label: '3 h' },
  { min: 240, label: '4 h' }, { min: 360, label: '6 h' }, { min: 480, label: '8 h' },
];

const messageErreur = (e: any, defaut: string) => {
  try { return JSON.parse(String(e.message).replace(/^HTTP \d+: /, '')).error || defaut; } catch { return defaut; }
};

/**
 * « Je sais le faire » : se proposer comme prestataire de ce modèle.
 * Une cliente passe en compte Pro dans le même formulaire (nom du salon, quartier).
 */
export default function JeSaisLeFaireModal({ modele, onClose, offreActuelle, onFait }: Props) {
  const navigate = useNavigate();
  const { isAuthenticated, role, user } = useAuthStore();
  const { showToast } = useAppStore();
  const estPro = role?.nom === 'prestataire';
  const placesOffre = useOffreLancement();
  const [prix, setPrix] = useState('');
  const [duree, setDuree] = useState(120);
  const [domicile, setDomicile] = useState(false);
  const [salon, setSalon] = useState('');
  const [quartier, setQuartier] = useState('');
  const communeMemo = usePosition((e) => e.commune);
  const [commune, setCommune] = useState<string | null>(null);
  const [tel, setTel] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!modele) return;
    setPrix(offreActuelle?.prix ? String(offreActuelle.prix) : '');
    setDuree(offreActuelle?.duree_minutes || (modele.categorie === 'coiffure' ? 240 : 60));
    setDomicile(!!offreActuelle?.is_domicile);
    setTel((t) => t || (user as any)?.telephone || '');
    setCommune((c) => c || (user as any)?.commune || communeMemo || null);
  }, [modele, offreActuelle, user, communeMemo]);

  const valider = async () => {
    if (!modele) return;
    const montant = Number(prix);
    if (!montant || montant < 500) { showToast('Indique ton prix (500 FCFA minimum)', 'error'); return; }
    setEnvoi(true);
    try {
      let nouvelleSession: { token: string; user: any } | null = null;
      if (!estPro) {
        if (salon.trim().length < 2) { showToast('Indique le nom de ton salon', 'error'); setEnvoi(false); return; }
        if (!commune) { showToast('Choisis ta commune : les clientes proches te verront en premier 📍', 'error'); setEnvoi(false); return; }
        const r = await api.prestataires.devenirPro({ nom_commercial: salon.trim(), commune, ville: commune, quartier: quartier.trim() || undefined, telephone_pro: tel.trim() || undefined });
        nouvelleSession = { token: r.token, user: r.user };
        // Le jeton est lu dans le stockage par chaque requête : on l'écrit tout de suite
        localStorage.setItem('prestaci-auth', JSON.stringify({ user: r.user, role: { id: 2, nom: 'prestataire', description: '', created_at: '' }, token: r.token }));
      }
      const r = await api.modeles.proposer(modele.id, { prix: montant, duree_minutes: duree, is_domicile: domicile });
      showToast(r.mis_a_jour
        ? 'Ton offre est mise à jour ✅'
        : `Bravo ! Tu proposes ce modèle à ${montant.toLocaleString('fr-FR')} FCFA. Les clientes peuvent réserver chez toi.`, 'success');
      onFait?.();
      onClose();
      if (nouvelleSession) {
        // Bascule l'app en mode Pro (après fermeture : l'interface change d'arborescence)
        useAuthStore.setState({ user: nouvelleSession.user, role: { id: 2, nom: 'prestataire', description: '', created_at: '' } as any, token: nouvelleSession.token, isAuthenticated: true });
      }
    } catch (e: any) {
      showToast(messageErreur(e, "Impossible d'enregistrer ton offre"), 'error');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <AnimatePresence>
      {modele && (
        <motion.div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="bg-white dark:bg-gray-900 w-full sm:max-w-md max-h-[94dvh] rounded-t-3xl sm:rounded-3xl overflow-y-auto"
            initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">✋ Je sais le faire</h2>
              <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  <ModeleVisuel modele={modele} compact className="w-full h-full" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white first-letter:uppercase line-clamp-2">{modele.titre}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Les clientes qui aiment ce modèle pourront réserver chez toi.</p>
                </div>
              </div>

              {!isAuthenticated ? (
                <div className="space-y-2 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Crée ton compte gratuit pour proposer ce modèle à tes futures clientes.</p>
                  <button onClick={() => { onClose(); navigate('/register?role=prestataire'); }} className="w-full py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold">Créer mon compte</button>
                  <button onClick={() => { onClose(); navigate('/login'); }} className="w-full py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold">J'ai déjà un compte</button>
                </div>
              ) : (
                <>
                  {!estPro && (
                    <div className="space-y-2 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/10 p-3">
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Ton espace pro (gratuit){placesOffre > 0 && <span className="ml-1 text-pink-600 dark:text-pink-400">+ 🎁 1 mois Pro offert</span>}</p>
                      <input value={salon} onChange={(e) => setSalon(e.target.value)} placeholder="Nom de ton salon (ou « Coiffure par Awa »)"
                        className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none" />
                      <div className="grid grid-cols-2 gap-2">
                        <ChoixCommune valeur={commune} onChange={setCommune} vide="Ta commune" />
                        <input value={quartier} onChange={(e) => setQuartier(e.target.value)} placeholder="Quartier (ex. Angré)"
                          className="px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none" />
                      </div>
                      <input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="Téléphone" inputMode="tel"
                        className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none" />
                      <p className="text-xs text-amber-800/80 dark:text-amber-200/70">📍 Les clientes de ta commune te verront en premier.</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ton prix pour ce modèle</p>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800">
                      <input value={prix} onChange={(e) => setPrix(e.target.value.replace(/\D/g, ''))} placeholder="15000" inputMode="numeric"
                        className="flex-1 bg-transparent text-2xl font-bold text-gray-900 dark:text-white placeholder-gray-300 focus:outline-none" />
                      <span className="text-gray-500 font-semibold">FCFA</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Durée</p>
                    <div className="flex flex-wrap gap-2">
                      {DUREES.map((d) => (
                        <button key={d.min} onClick={() => setDuree(d.min)}
                          className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${duree === d.min ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 cursor-pointer">
                    <Home className="w-5 h-5 text-gray-500" />
                    <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">Je me déplace à domicile</span>
                    <input type="checkbox" checked={domicile} onChange={(e) => setDomicile(e.target.checked)} className="w-5 h-5 accent-pink-500" />
                  </label>

                  <button onClick={valider} disabled={envoi}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
                    {envoi ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scissors className="w-5 h-5" />}
                    {envoi ? 'Enregistrement…' : offreActuelle ? 'Mettre à jour mon offre' : estPro ? 'Me proposer pour ce modèle' : 'Créer mon espace pro et me proposer'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

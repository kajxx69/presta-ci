import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Camera, Link2, Loader2, CheckCircle2, ImagePlus } from 'lucide-react';
import { api, ApiCategory } from '../../lib/api';
import { compresserImage } from '../../lib/compresserImage';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Lien reçu via « Partager » depuis Pinterest (Android) */
  lienInitial?: string;
}

const EMOJI: Record<string, string> = { coiffure: '💇🏾‍♀️', ongle: '💅🏾', beaute: '💄', bien: '🧖🏾‍♀️' };
const emojiPour = (nom: string) => {
  const n = nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return Object.entries(EMOJI).find(([k]) => n.includes(k))?.[1] || '✨';
};

/**
 * « J'ai mon modèle » : la cliente envoie la photo trouvée sur Pinterest
 * (capture, galerie, ou lien partagé) et les salons lui répondent avec un prix.
 * La photo reste privée entre elle et les salons ciblés.
 */
export default function JaiMonModeleModal({ open, onClose, lienInitial }: Props) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { showToast } = useAppStore();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [lien, setLien] = useState(lienInitial || '');
  const [categorieId, setCategorieId] = useState<number | null>(null);
  const [ville, setVille] = useState('');
  const [budget, setBudget] = useState('');
  const [precision, setPrecision] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<{ notifies: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setResultat(null);
    if (lienInitial) setLien(lienInitial);
    setVille((v) => v || (user as any)?.ville || '');
    api.getCategories().then((c) => {
      setCategories(c);
      setCategorieId((id) => id ?? c.find((x) => /coiffure/i.test(x.nom))?.id ?? c[0]?.id ?? null);
    }).catch(() => {});
  }, [open, lienInitial, user]);

  const choisirPhoto = async (f?: File) => {
    if (!f) return;
    try { setPhoto(await compresserImage(f)); } catch (e: any) { showToast(e.message, 'error'); }
  };

  const envoyer = async () => {
    if (!isAuthenticated) {
      showToast('Connecte-toi pour recevoir les prix des salons', 'info');
      navigate('/login');
      return;
    }
    if (!photo && !lien.trim()) { showToast('Ajoute la photo de ton modèle ou colle son lien', 'error'); return; }
    if (!categorieId) { showToast('Choisis le type de prestation', 'error'); return; }
    const cat = categories.find((c) => c.id === categorieId);
    setEnvoi(true);
    try {
      const r = await api.demandes.create({
        titre: `Mon modèle${cat ? ` — ${cat.nom}` : ''}`.slice(0, 120),
        description: precision.trim(),
        categorie_id: categorieId,
        ville: ville.trim() || undefined,
        budget_max: budget ? Number(budget) : undefined,
        photo: photo || undefined,
        lien_inspiration: lien.trim() || undefined,
      });
      setResultat({ notifies: r.prestataires_notifies });
      setPhoto(null); setLien(''); setPrecision(''); setBudget('');
    } catch (e: any) {
      let msg = "L'envoi a échoué, réessaie.";
      try { msg = JSON.parse(String(e.message).replace(/^HTTP \d+: /, '')).error || msg; } catch { /* brut */ }
      showToast(msg, 'error');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="bg-white dark:bg-gray-900 w-full sm:max-w-md max-h-[94dvh] rounded-t-3xl sm:rounded-3xl overflow-y-auto"
            initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">📸 J'ai mon modèle</h2>
              <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {resultat ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
                <p className="text-lg font-semibold text-gray-900 dark:text-white">C'est envoyé !</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {resultat.notifies > 0
                    ? `${resultat.notifies} salon${resultat.notifies > 1 ? 's ont' : ' a'} reçu ton modèle. Leurs prix arrivent dans tes messages.`
                    : "Ton modèle est publié. Les salons qui le proposent te répondront dans tes messages."}
                </p>
                <button onClick={() => { onClose(); navigate('/app/messages'); }} className="w-full py-3 rounded-2xl bg-pink-500 text-white font-semibold">Voir mes messages</button>
                <button onClick={onClose} className="w-full py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold">Continuer à découvrir</button>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 -mt-1">
                  Tu as trouvé ton style sur Pinterest ? Envoie-le : les salons te répondent avec leur prix.
                </p>

                <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => choisirPhoto(e.target.files?.[0])} />
                {photo ? (
                  <div className="relative">
                    <img src={photo} alt="Ton modèle" className="w-full max-h-80 object-contain rounded-2xl bg-gray-100 dark:bg-gray-800" />
                    <button onClick={() => input.current?.click()} className="absolute bottom-2 right-2 px-3 py-1.5 rounded-full bg-white/90 text-sm font-semibold shadow">Changer</button>
                  </div>
                ) : (
                  <button onClick={() => input.current?.click()}
                    className="w-full h-44 rounded-2xl border-2 border-dashed border-pink-300 dark:border-pink-700 bg-pink-50/60 dark:bg-pink-900/10 flex flex-col items-center justify-center gap-2 text-pink-700 dark:text-pink-300">
                    <ImagePlus className="w-9 h-9" />
                    <span className="font-semibold">Ajouter la photo de mon modèle</span>
                    <span className="text-xs text-pink-600/80 dark:text-pink-300/70">Capture d'écran Pinterest, photo de ta galerie…</span>
                  </button>
                )}

                <label className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800">
                  <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input value={lien} onChange={(e) => setLien(e.target.value)} placeholder="Ou colle le lien Pinterest / Instagram / TikTok"
                    className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none" inputMode="url" />
                </label>

                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">C'est pour…</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <button key={c.id} onClick={() => setCategorieId(c.id)}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${categorieId === c.id ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                        {emojiPour(c.nom)} {c.nom}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Quartier (ex. Cocody)"
                    className="px-3 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none" />
                  <input value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))} placeholder="Budget max (FCFA)" inputMode="numeric"
                    className="px-3 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none" />
                </div>
                <textarea value={precision} onChange={(e) => setPrecision(e.target.value)} rows={2} maxLength={500}
                  placeholder="Une précision ? (longueur, couleur, date souhaitée…)"
                  className="w-full px-3 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none resize-none" />

                <button onClick={envoyer} disabled={envoi}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
                  {envoi ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  {envoi ? 'Envoi…' : 'Trouver qui peut me le faire'}
                </button>
                <p className="text-[11px] text-center text-gray-400">Ta photo est visible uniquement par les salons qui reçoivent ta demande.</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

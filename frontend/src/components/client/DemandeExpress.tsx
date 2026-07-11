import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Megaphone, Sparkles, Star, ShieldCheck, MessageCircle, Loader2,
  ChevronRight, Clock, CheckCircle2, XCircle, Wallet, MapPin, CalendarDays
} from 'lucide-react';
import { api, ApiCategory } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SuccessCheck } from '../ui/SuccessCheck';

/* ─────────────────────────────────────────────────────────────
 * Demande Express — le marché inversé de PrestaCI :
 * le client décrit son besoin, les prestataires viennent à lui.
 * ───────────────────────────────────────────────────────────── */

interface DemandeExpressCardProps {
  onPublier: () => void;
  onVoirMesDemandes: () => void;
  isAuthenticated: boolean;
}

/** Bannière CTA affichée sur la page d'accueil client */
export function DemandeExpressCard({ onPublier, onVoirMesDemandes, isAuthenticated }: DemandeExpressCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 px-5 py-5 shadow-lg"
    >
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -bottom-10 -left-6 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white/90 bg-white/20 px-2.5 py-1 rounded-full">
          <Sparkles className="w-3 h-3" /> Nouveau · Demande Express
        </p>
        <h2 className="mt-2.5 text-lg font-extrabold text-white leading-snug">
          Vous ne trouvez pas ? Décrivez votre besoin,<br className="hidden sm:block" /> les prestataires viennent à vous.
        </h2>
        <p className="mt-1 text-[13px] text-white/85">
          Publiez en 30 secondes, recevez des réponses directement dans vos messages.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={onPublier}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-orange-600 text-sm font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
          >
            <Megaphone className="w-4 h-4" />
            Publier mon besoin
          </button>
          {isAuthenticated && (
            <button
              onClick={onVoirMesDemandes}
              className="inline-flex items-center gap-1 px-3.5 py-2.5 rounded-2xl bg-white/15 text-white text-sm font-semibold hover:bg-white/25 transition-colors"
            >
              Mes demandes <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.section>
  );
}

/* ───────────────────────── Formulaire ───────────────────────── */

interface DemandeExpressModalProps {
  open: boolean;
  onClose: () => void;
  categories: ApiCategory[];
  defaultVille?: string;
}

export function DemandeExpressModal({ open, onClose, categories, defaultVille }: DemandeExpressModalProps) {
  const { showToast } = useAppStore();
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [categorieId, setCategorieId] = useState<number | ''>('');
  const [ville, setVille] = useState(defaultVille || '');
  const [budget, setBudget] = useState('');
  const [dateSouhaitee, setDateSouhaitee] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setSuccessCount(null);
      if (defaultVille && !ville) setVille(defaultVille);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setTitre(''); setDescription(''); setCategorieId(''); setBudget(''); setDateSouhaitee('');
    setSuccessCount(null);
  };

  const handleSubmit = async () => {
    if (titre.trim().length < 3) { showToast('Donnez un titre à votre besoin (3 caractères min.)', 'error'); return; }
    if (description.trim().length < 10) { showToast('Décrivez votre besoin en quelques mots (10 caractères min.)', 'error'); return; }
    if (!categorieId) { showToast('Choisissez une catégorie', 'error'); return; }
    setSubmitting(true);
    try {
      const res = await api.demandes.create({
        titre: titre.trim(),
        description: description.trim(),
        categorie_id: Number(categorieId),
        ville: ville.trim() || undefined,
        budget_max: budget ? Number(budget) : undefined,
        date_souhaitee: dateSouhaitee || undefined,
      });
      setSuccessCount(res.prestataires_notifies);
    } catch (e: any) {
      showToast(e.message || 'Impossible de publier votre demande', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent';

  return (
    <Modal open={open} onClose={() => { onClose(); if (successCount !== null) reset(); }} title={successCount === null ? 'Publier mon besoin' : undefined} size="md">
      {successCount !== null ? (
        <div className="py-6 text-center space-y-4">
          <SuccessCheck size={72} className="mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Votre demande est publiée !</h3>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              {successCount > 0
                ? <>🔔 <strong>{successCount} prestataire{successCount > 1 ? 's' : ''}</strong> {successCount > 1 ? 'ont été notifiés' : 'a été notifié'}. Leurs réponses arriveront dans vos <strong>Messages</strong>.</>
                : 'Elle est visible par les prestataires de la catégorie. Vous serez notifié dès la première réponse.'}
            </p>
          </div>
          <Button fullWidth onClick={() => { onClose(); reset(); }}>Compris !</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[13px] text-gray-500 dark:text-gray-400 -mt-1">
            Décrivez ce qu'il vous faut : les prestataires de la catégorie sont notifiés et vous répondent directement en message. Gratuit et sans engagement.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">De quoi avez-vous besoin ? *</label>
            <input
              type="text" value={titre} onChange={e => setTitre(e.target.value)} maxLength={120}
              placeholder="Ex : Coiffeuse à domicile pour un mariage"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Quelques détails *</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} rows={3}
              placeholder="Date, lieu, nombre de personnes, style souhaité…"
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Catégorie *</label>
            <select value={categorieId} onChange={e => setCategorieId(e.target.value ? Number(e.target.value) : '')} className={inputClass}>
              <option value="">Choisir une catégorie…</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icone ? `${c.icone} ` : ''}{c.nom}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Ville</label>
              <input type="text" value={ville} onChange={e => setVille(e.target.value)} maxLength={80} placeholder="Abidjan" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Budget max (FCFA)</label>
              <input type="number" min={0} value={budget} onChange={e => setBudget(e.target.value)} placeholder="Optionnel" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Pour quand ?</label>
            <input type="date" value={dateSouhaitee} onChange={e => setDateSouhaitee(e.target.value)} min={new Date().toISOString().split('T')[0]} className={inputClass} />
          </div>

          <Button fullWidth loading={submitting} icon={Megaphone} onClick={handleSubmit}>
            Publier ma demande
          </Button>
        </div>
      )}
    </Modal>
  );
}

/* ───────────────────── Suivi des demandes ───────────────────── */

const STATUT_LABELS: Record<string, { label: string; className: string }> = {
  ouverte: { label: 'En cours', className: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  pourvue: { label: 'Prestataire trouvé', className: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  annulee: { label: 'Annulée', className: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
  expiree: { label: 'Expirée', className: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
};

interface MesDemandesModalProps {
  open: boolean;
  onClose: () => void;
  onNouvelleDemande: () => void;
}

export function MesDemandesModal({ open, onClose, onNouvelleDemande }: MesDemandesModalProps) {
  const navigate = useNavigate();
  const { showToast, setCurrentTab } = useAppStore();
  const [demandes, setDemandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [closingId, setClosingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.demandes.mine()
      .then(setDemandes)
      .catch(() => setDemandes([]))
      .finally(() => setLoading(false));
  }, [open]);

  const openConversation = (conversationId: number) => {
    sessionStorage.setItem('prestaci-open-conversation', String(conversationId));
    setCurrentTab('messages');
    onClose();
    navigate('/app');
  };

  const cloturer = async (id: number, statut: 'pourvue' | 'annulee') => {
    setClosingId(id);
    try {
      await api.demandes.cloturer(id, statut);
      setDemandes(prev => prev.map(d => (d.id === id ? { ...d, statut } : d)));
      showToast(statut === 'pourvue' ? 'Super ! Demande marquée comme pourvue.' : 'Demande annulée', 'success');
    } catch (e: any) {
      showToast(e.message || 'Erreur lors de la clôture', 'error');
    } finally {
      setClosingId(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Mes demandes" size="lg">
      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
      ) : demandes.length === 0 ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
            <Megaphone className="w-7 h-7 text-orange-500" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Vous n'avez pas encore publié de demande.</p>
          <Button onClick={() => { onClose(); onNouvelleDemande(); }}>Publier mon premier besoin</Button>
        </div>
      ) : (
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {demandes.map(d => {
            const statut = STATUT_LABELS[d.statut] || STATUT_LABELS.ouverte;
            return (
              <div key={d.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {d.categorie_icone ? `${d.categorie_icone} ` : ''}{d.titre}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      {d.categorie_nom && <span>{d.categorie_nom}</span>}
                      {d.ville && <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" />{d.ville}</span>}
                      {d.budget_max && <span className="inline-flex items-center gap-0.5"><Wallet className="w-3 h-3" />{Number(d.budget_max).toLocaleString()} FCFA max</span>}
                      {d.date_souhaitee && <span className="inline-flex items-center gap-0.5"><CalendarDays className="w-3 h-3" />{d.date_souhaitee}</span>}
                    </div>
                  </div>
                  <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${statut.className}`}>
                    {statut.label}
                  </span>
                </div>

                {d.reponses?.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {d.reponses.length} réponse{d.reponses.length > 1 ? 's' : ''} :
                    </p>
                    {d.reponses.map((r: any) => (
                      <button
                        key={r.prestataire_id}
                        onClick={() => openConversation(r.conversation_id)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(r.prestataire_nom || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1">
                            {r.prestataire_nom}
                            {r.prestataire_verifie && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            {Number(r.prestataire_note || 0).toFixed(1)} ({r.prestataire_nombre_avis} avis)
                            {r.prestataire_ville ? ` · ${r.prestataire_ville}` : ''}
                          </p>
                        </div>
                        <MessageCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : d.statut === 'ouverte' ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> En attente de réponses — les prestataires ont été notifiés.
                  </p>
                ) : null}

                {d.statut === 'ouverte' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => cloturer(d.id, 'pourvue')}
                      disabled={closingId === d.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> J'ai trouvé
                    </button>
                    <button
                      onClick={() => cloturer(d.id, 'annulee')}
                      disabled={closingId === d.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Annuler
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

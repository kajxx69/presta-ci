import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, MapPin, Wallet, CalendarDays, Send, Loader2, CheckCircle2, Users, ChevronDown, Zap } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';

/**
 * Opportunités Demande Express : les besoins publiés par des clients dans les
 * catégories du prestataire. Répondre ouvre une conversation avec le client.
 */
export default function OpportunitesSection({ onNavigateToTab, hasActiveServices }: { onNavigateToTab: (tab: string) => void; hasActiveServices: boolean }) {
  const { showToast } = useAppStore();
  const [opportunites, setOpportunites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [sendingId, setSendingId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    api.demandes.opportunites()
      .then(items => { if (mounted) setOpportunites(items); })
      .catch(() => { /* section optionnelle : silence en cas d'erreur */ })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const repondre = async (id: number) => {
    setSendingId(id);
    try {
      const { conversation_id } = await api.demandes.repondre(id, message.trim() || undefined);
      setOpportunites(prev => prev.map(o => (o.id === id ? { ...o, deja_repondu: true, nombre_reponses: (o.nombre_reponses || 0) + 1 } : o)));
      setExpandedId(null);
      setMessage('');
      showToast('Réponse envoyée ! La conversation est ouverte avec le client.', 'success');
      sessionStorage.setItem('prestaci-open-conversation', String(conversation_id));
      onNavigateToTab('messages');
    } catch (e: any) {
      showToast(e.message || 'Impossible de répondre à cette demande', 'error');
    } finally {
      setSendingId(null);
    }
  };

  if (loading) return null;

  // Sans service actif, le matching ne peut pas connaître les catégories du
  // prestataire : il ne recevra ni notifications ni opportunités. L'expliquer
  // vaut mieux que de cacher silencieusement la section.
  if (opportunites.length === 0) {
    if (hasActiveServices) return null;
    return (
      <section className="rounded-2xl border border-orange-200/70 dark:border-orange-800/40 bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-950/30 dark:to-rose-950/20 p-5">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-4 h-4 text-white" />
          </span>
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Demande Express : recevez du business sans rien faire</h2>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
              Les clients publient leurs besoins et les prestataires de la catégorie sont notifiés.
              Ajoutez <strong>au moins un service actif</strong> pour que PrestaCI connaisse votre métier et vous envoie leurs demandes.
            </p>
            <button
              onClick={() => onNavigateToTab('services')}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
            >
              Ajouter un service
            </button>
          </div>
        </div>
      </section>
    );
  }

  const disponibles = opportunites.filter(o => !o.deja_repondu && !o.complete);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-orange-200/70 dark:border-orange-800/40 bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-950/30 dark:to-rose-950/20 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-4 h-4 text-white" />
          </span>
          Opportunités pour vous
        </h2>
        {disponibles.length > 0 && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-500 text-white animate-pulse">
            {disponibles.length} nouvelle{disponibles.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 -mt-2">
        Des clients recherchent vos services en ce moment. Premier arrivé, premier servi !
      </p>

      {opportunites.some(o => o.acces_anticipe) && (
        <p className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 -mt-2 flex items-center gap-1">
          <Zap className="w-3 h-3" /> Accès anticipé abonné — les autres prestataires ne voient pas encore certaines de ces demandes.
        </p>
      )}

      <div className="space-y-3">
        {opportunites.slice(0, 5).map(o => (
          <div key={o.id} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-soft p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {o.categorie_icone ? `${o.categorie_icone} ` : ''}{o.titre}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Par {o.client_nom}{o.categorie_nom ? ` · ${o.categorie_nom}` : ''}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {o.acces_anticipe && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 inline-flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" /> Accès anticipé
                  </span>
                )}
                {o.meme_ville && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                    📍 Votre ville
                  </span>
                )}
              </div>
            </div>

            <p className="text-[13px] text-gray-600 dark:text-gray-300 line-clamp-2">{o.description}</p>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
              {o.ville && <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" />{o.ville}</span>}
              {o.budget_max && <span className="inline-flex items-center gap-0.5"><Wallet className="w-3 h-3" />Budget : {Number(o.budget_max).toLocaleString()} FCFA</span>}
              {o.date_souhaitee && <span className="inline-flex items-center gap-0.5"><CalendarDays className="w-3 h-3" />{o.date_souhaitee}</span>}
              <span className="inline-flex items-center gap-0.5"><Users className="w-3 h-3" />{o.nombre_reponses} réponse{o.nombre_reponses > 1 ? 's' : ''}</span>
            </div>

            {o.deja_repondu ? (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Vous avez répondu — retrouvez le client dans vos messages.
              </p>
            ) : o.complete ? (
              <p className="text-xs text-gray-400">Cette demande a atteint son maximum de réponses.</p>
            ) : expandedId === o.id ? (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    maxLength={1000}
                    rows={2}
                    placeholder="Présentez-vous en une phrase : disponibilité, tarif indicatif… (optionnel)"
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => repondre(o.id)}
                      disabled={sendingId === o.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      {sendingId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Envoyer ma proposition
                    </button>
                    <button
                      onClick={() => { setExpandedId(null); setMessage(''); }}
                      className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold"
                    >
                      Plus tard
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <button
                onClick={() => { setExpandedId(o.id); setMessage(''); }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300 text-xs font-bold hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" /> Répondre à cette demande
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

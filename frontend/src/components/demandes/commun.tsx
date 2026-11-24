import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Minus, Plus, ArrowRight, Loader2 } from 'lucide-react';
import type { ModeleDemande, OffreFil, CategorieModele } from '../../lib/api';

export const fcfa = (n: number | null | undefined) => `${(n ?? 0).toLocaleString('fr-FR')} F CFA`;
export const CATEGORIE_LABEL: Record<CategorieModele, string> = { coiffure: 'Coiffure', ongles: 'Ongles', maquillage: 'Maquillage', cils: 'Cils & sourcils', soins: 'Soins' };

/** Date courte : « sam. 29 nov. · 15:30 » */
export function quand(date?: string | null, heure?: string | null) {
  if (!date) return '';
  const d = new Date(`${date}T12:00:00`);
  const j = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  return heure ? `${j} · ${heure.replace(':', 'h')}` : j;
}

/** Saisie d'un montant : chiffres seulement, affiché avec espaces. */
export function lireMontant(v: string): number { return Number(v.replace(/\D/g, '').slice(0, 8)) || 0; }
export function ecrireMontant(n: number): string { return n ? n.toLocaleString('fr-FR') : ''; }

/** Vignette du modèle : sa photo, sinon un dégradé chaud (épingles Pinterest sans image copiée). */
export function Vignette({ modele, className = 'w-16 h-20' }: { modele: Pick<ModeleDemande, 'photo_url' | 'titre'>; className?: string }) {
  return (
    <div className={`${className} rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-b from-[#D4B2A4] to-[#A87C6C]`}>
      {modele.photo_url && <img src={modele.photo_url} alt="" className="w-full h-full object-cover" loading="lazy" />}
    </div>
  );
}

type Ton = 'attente' | 'ok' | 'neutre' | 'vin';
const TONS: Record<Ton, string> = {
  attente: 'bg-[#F3E6D8] text-[#6B4A22] dark:bg-amber-900/30 dark:text-amber-200',
  ok: 'bg-[#E3EDDD] text-[#33502B] dark:bg-emerald-900/30 dark:text-emerald-200',
  neutre: 'bg-sable text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  vin: 'bg-vin-50 text-vin-700 dark:bg-vin-900/30 dark:text-vin-200',
};
export function Pastille({ ton, children }: { ton: Ton; children: React.ReactNode }) {
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-[13px] font-medium ${TONS[ton]}`}>{children}</span>;
}
export function PastilleMeches({ meches }: { meches: boolean | null }) {
  if (meches === null) return null;
  return meches ? <Pastille ton="ok">Mèches comprises</Pastille> : <Pastille ton="attente">Mèches non comprises</Pastille>;
}

/** Écran plein (au-dessus de la barre du bas), rendu au niveau du <body>. */
export function PleinEcran({ ouvert, onFermer, titre, sousTitre, children, pied }: {
  ouvert: boolean; onFermer: () => void; titre: React.ReactNode; sousTitre?: React.ReactNode; children: React.ReactNode; pied?: React.ReactNode;
}) {
  return createPortal(
    <AnimatePresence>
      {ouvert && (
        <motion.div className="fixed inset-0 z-[80] bg-creme dark:bg-gray-950 flex flex-col sm:items-center"
          initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
          <div className="w-full sm:max-w-md flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-3 px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 border-b border-ligne dark:border-gray-800">
              <button onClick={onFermer} aria-label="Retour" className="w-11 h-11 flex-shrink-0 rounded-full bg-white dark:bg-gray-900 border border-ligne dark:border-gray-700 flex items-center justify-center">
                <ChevronLeft className="w-6 h-6 text-encre dark:text-white" strokeWidth={1.8} />
              </button>
              <div className="min-w-0">
                <p className="text-lg font-bold text-encre dark:text-white truncate">{titre}</p>
                {sousTitre && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{sousTitre}</p>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {pied && <div className="px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-ligne dark:border-gray-800 bg-creme dark:bg-gray-950">{pied}</div>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/**
 * Fil de négociation (maquette 12). `moi` : qui regarde. Mes offres à droite en bordeaux,
 * celles de l'autre à gauche en blanc ; bandeau « Dernière offre » à la fin.
 */
export function FilOffres({ offres, moi, meches, derniere }: { offres: OffreFil[]; moi: 'cliente' | 'pro'; meches: boolean | null; derniere: number | null }) {
  const fin = useRef<HTMLDivElement>(null);
  useEffect(() => { fin.current?.scrollIntoView({ block: 'end' }); }, [offres.length]);
  const libelleMeches = meches === null ? null : meches ? 'Mèches comprises' : 'Mèches non comprises';
  return (
    <div className="space-y-3">
      {offres.map((o, i) => {
        const mien = o.auteur === moi;
        const premiere = i === 0;
        const texte = premiere && o.auteur === 'cliente' ? `Offre : ${fcfa(o.montant)}`
          : o.auteur === 'pro' ? `${mien ? 'Contre-proposition' : 'Elle propose'} : ${fcfa(o.montant)}`
            : `Je peux monter à ${fcfa(o.montant)}`;
        return (
          <div key={i} className={`flex ${mien ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-5 py-3.5 rounded-[22px] ${mien ? 'bg-vin-600 text-white' : 'bg-white dark:bg-gray-900 border border-ligne dark:border-gray-800 text-encre dark:text-white'}`}>
              <p className="font-semibold text-[17px]">{texte}</p>
              <p className={`text-sm ${mien ? 'text-white/85' : 'text-gray-500 dark:text-gray-400'}`}>{premiere ? libelleMeches : i > 0 && !mien && o.auteur === 'cliente' ? 'Offre mise à jour' : libelleMeches}</p>
            </div>
          </div>
        );
      })}
      {derniere != null && offres.length > 1 && (
        <div className="flex justify-center pt-1"><Pastille ton="attente">Dernière offre : {fcfa(derniere)}</Pastille></div>
      )}
      <div ref={fin} />
    </div>
  );
}

/** Barre d'actions du fil : Refuser · Accepter X · champ « Contre-proposer un montant ». */
export function BarreNegociation({ accepter, onAccepter, onRefuser, onProposer, occupe, placeholder = 'Contre-proposer un montant' }: {
  accepter: number | null; onAccepter: () => void; onRefuser: () => void; onProposer: (montant: number) => Promise<boolean>; occupe: boolean; placeholder?: string;
}) {
  const [saisie, setSaisie] = useState('');
  const envoyer = async () => {
    const m = lireMontant(saisie);
    if (!m) return;
    if (await onProposer(m)) setSaisie('');
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <button onClick={onRefuser} disabled={occupe} className="flex-1 py-3.5 rounded-full bg-white dark:bg-gray-900 border border-ligne dark:border-gray-700 font-semibold text-encre dark:text-white disabled:opacity-50">Refuser</button>
        {accepter != null && (
          <button onClick={onAccepter} disabled={occupe} className="flex-[1.8] py-3.5 rounded-full bg-vin-600 text-white font-semibold disabled:opacity-60 truncate px-3">
            {occupe ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `Accepter ${fcfa(accepter)}`}
          </button>
        )}
      </div>
      <div className="flex gap-3">
        <input value={saisie} onChange={(e) => setSaisie(ecrireMontant(lireMontant(e.target.value)))} inputMode="numeric" placeholder={placeholder}
          onKeyDown={(e) => e.key === 'Enter' && envoyer()}
          className="flex-1 min-w-0 px-5 py-3.5 rounded-full bg-white dark:bg-gray-900 border border-ligne dark:border-gray-700 text-encre dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-vin-400" />
        <button onClick={envoyer} disabled={occupe || !lireMontant(saisie)} aria-label="Envoyer le montant"
          className="w-[52px] h-[52px] flex-shrink-0 rounded-full bg-vin-600 text-white flex items-center justify-center disabled:opacity-50">
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

/** Feuille « Augmenter mon montant » (maquette 13). */
export function AugmenterMontant({ ouvert, onFermer, actuel, reference, onValider }: {
  ouvert: boolean; onFermer: () => void; actuel: number; reference: number | null; onValider: (prix: number) => Promise<void>;
}) {
  const [prix, setPrix] = useState(actuel);
  const [occupe, setOccupe] = useState(false);
  useEffect(() => { if (ouvert) setPrix(actuel + 1000); }, [ouvert, actuel]);
  const pas = 1000;
  const valider = async () => { setOccupe(true); try { await onValider(prix); } finally { setOccupe(false); } };
  const pastille = 'px-5 py-2.5 rounded-full border border-ligne dark:border-gray-700 bg-white dark:bg-gray-900 text-encre dark:text-white font-medium';
  return createPortal(
    <AnimatePresence>
      {ouvert && (
        <motion.div className="fixed inset-0 z-[90] bg-black/30 flex items-end sm:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onFermer}>
          <motion.div className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-[32px] sm:rounded-[32px] px-6 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
            initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-ligne mx-auto mb-5" />
            <h2 className="text-2xl font-bold text-encre dark:text-white">Augmenter mon montant</h2>
            {reference != null && <p className="text-gray-500 dark:text-gray-400 mt-1">Prix de référence : {fcfa(reference)}</p>}
            <div className="flex items-center justify-between my-6">
              <button onClick={() => setPrix((p) => Math.max(actuel + pas, p - pas))} aria-label="Moins" className="w-14 h-14 rounded-full border border-ligne dark:border-gray-700 flex items-center justify-center"><Minus className="w-6 h-6" /></button>
              <p className="text-[32px] font-bold text-encre dark:text-white">{fcfa(prix)}</p>
              <button onClick={() => setPrix((p) => p + pas)} aria-label="Plus" className="w-14 h-14 rounded-full border border-ligne dark:border-gray-700 flex items-center justify-center"><Plus className="w-6 h-6" /></button>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button onClick={() => setPrix((p) => p + 2000)} className={pastille}>+2 000</button>
              <button onClick={() => setPrix((p) => p + 5000)} className={pastille}>+5 000</button>
              {reference != null && reference > actuel && <button onClick={() => setPrix(reference)} className={pastille}>Prix de référence</button>}
            </div>
            {reference != null && <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">{prix < reference ? 'Ton prix reste sous le prix de référence.' : prix === reference ? 'Tu proposes le prix de référence.' : 'Ton prix dépasse le prix de référence.'}</p>}
            <button onClick={valider} disabled={occupe || prix <= actuel} className="mt-5 w-full py-4 rounded-full bg-vin-600 text-white text-lg font-semibold disabled:opacity-60">
              {occupe ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Mettre à jour ma demande'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Message d'erreur du serveur, lisible (« Ce montant est déjà proposé »…). */
export function erreurDe(e: any, defaut = 'Action impossible, réessaie'): string {
  try { return JSON.parse(String(e?.message).replace(/^HTTP \d+: /, '')).error || defaut; } catch { return defaut; }
}

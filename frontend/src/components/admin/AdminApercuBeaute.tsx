import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Circle, Heart, Scissors, Images, CreditCard, UserPlus, ArrowRight, RefreshCw } from 'lucide-react';
import { api, ApercuAdmin, Modele } from '../../lib/api';
import ModeleVisuel from '../client/ModeleVisuel';
import { formatCurrency } from './AdminShared';

// Tableau de bord « beauté » : ce qui compte pour l'app d'inspiration
// (fil rempli ? les clientes swipent-elles ? les pros se proposent-elles ? ça paie ?)

export type NaviguerAdmin = (onglet: 'modeles' | 'payments' | 'users' | 'plans' | 'settings') => void;

const CATS: Record<string, string> = { coiffure: '💇🏾‍♀️ Coiffure', ongles: '💅🏾 Ongles', maquillage: '💄 Maquillage', cils: '👁️ Cils', soins: '🧴 Soins' };

function Etape({ ok, alerte, titre, detail, action, onAction }: { ok: boolean; alerte?: boolean; titre: string; detail: string; action?: string; onAction?: () => void }) {
  const Icone = ok ? CheckCircle2 : alerte ? AlertTriangle : Circle;
  return (
    <li className="flex items-start gap-3 py-2.5">
      <Icone className={`w-5 h-5 flex-shrink-0 mt-0.5 ${ok ? 'text-green-500' : alerte ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${ok ? 'text-gray-500 dark:text-gray-400 line-through decoration-gray-300' : 'text-gray-900 dark:text-white'}`}>{titre}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{detail}</p>
      </div>
      {!ok && action && onAction && (
        <button onClick={onAction} className="flex-shrink-0 text-xs font-semibold text-pink-600 dark:text-pink-400 inline-flex items-center gap-1 hover:underline">
          {action}<ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </li>
  );
}

function Chiffre({ icone: Icone, label, valeur, sous, fond }: { icone: any; label: string; valeur: string | number; sous?: string; fond: string }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
      <div className={`w-9 h-9 rounded-xl ${fond} flex items-center justify-center mb-3`}><Icone className="w-[18px] h-[18px] text-white" /></div>
      <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{valeur}</p>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
      {sous && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sous}</p>}
    </div>
  );
}

function Vignettes({ modeles, vide }: { modeles: Modele[]; vide: string }) {
  if (!modeles.length) return <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">{vide}</p>;
  return (
    <div className="grid grid-cols-4 gap-2">
      {modeles.map((m) => (
        <div key={m.id} className="relative rounded-xl overflow-hidden aspect-[3/4] bg-gray-100 dark:bg-gray-700">
          <ModeleVisuel modele={m} compact className="w-full h-full" />
          <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/80 to-transparent text-[10px] text-white">
            <span className="inline-flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 fill-white" />{m.nombre_likes}</span>
            {!!m.nb_offres && <span className="ml-1">· {m.nb_offres} pro{m.nb_offres > 1 ? 's' : ''}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminApercuBeaute({ onNavigate }: { onNavigate?: NaviguerAdmin }) {
  const [d, setD] = useState<ApercuAdmin | null>(null);
  const [erreur, setErreur] = useState('');
  const [charge, setCharge] = useState(true);

  const charger = useCallback(async () => {
    setCharge(true);
    // Serveur en veille / en redémarrage : quelques nouvelles tentatives avant d'afficher l'erreur
    for (let essai = 0; ; essai++) {
      try { setD(await api.modeles.admin.apercu()); setErreur(''); break; } catch (e: any) {
        const attente = [2000, 5000, 10000][essai];
        if (attente === undefined) {
          let detail = String(e?.message || e);
          try { detail = JSON.parse(detail.replace(/^HTTP \d+: /, '')).error || detail; } catch { /* texte brut */ }
          setErreur(detail);
          break;
        }
        await new Promise((ok) => setTimeout(ok, attente));
      }
    }
    setCharge(false);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  if (erreur && !d) return (
    <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
      Impossible de charger le tableau de bord beauté. <button onClick={charger} className="underline font-semibold">Réessayer</button>
      <p className="mt-1 text-xs opacity-80 break-words">Détail : {erreur}</p>
    </div>
  );
  if (!d) return <div className="h-48 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />;

  const gp = d.config.geniuspay;
  const tableauxActifs = d.tableaux.filter((t) => t.is_active);
  const tableauxEnErreur = tableauxActifs.filter((t) => t.derniere_erreur);
  const etapes = [
    {
      ok: tableauxActifs.length > 0 && d.modeles.total >= 30, alerte: tableauxEnErreur.length > 0,
      titre: 'Remplir le fil Découvrir',
      detail: tableauxEnErreur.length
        ? `${tableauxEnErreur.length} tableau(x) Pinterest en erreur : vérifie qu'ils sont publics`
        : `${d.modeles.total} photo(s) · ${tableauxActifs.length} tableau(x) Pinterest suivi(s) — vise au moins 30 photos`,
      action: 'Ajouter Pinterest', onAction: () => onNavigate?.('modeles'),
    },
    {
      ok: gp.configure && gp.mode === 'live', alerte: gp.mode === 'sandbox',
      titre: 'Paiement en ligne GeniusPay',
      detail: !gp.configure ? '⚠️ Clés absentes sur le serveur : les pros ne peuvent pas encore payer leur abonnement'
        : gp.mode === 'sandbox' ? '⚠️ Clés de TEST : les abonnements seraient gratuits. Mets les clés live (pk_live_…) sur Render.'
        : 'Clés live actives',
    },
    {
      ok: gp.webhook, alerte: gp.configure && !gp.webhook,
      titre: 'Webhook GeniusPay',
      detail: gp.webhook ? 'Confirmation instantanée des paiements' : 'GENIUSPAY_WEBHOOK_SECRET absent (les paiements sont quand même vérifiés toutes les 3 min)',
    },
    {
      ok: d.offres.prestataires >= 5,
      titre: 'Recruter des coiffeuses',
      detail: `${d.offres.prestataires} pro(s) se sont proposées sur ${d.offres.total} modèle(s) — vise 5 pros pour lancer`,
      action: 'Voir les pros', onAction: () => onNavigate?.('users'),
    },
  ];
  const offre = d.offre_lancement;
  const faites = etapes.filter((e) => e.ok).length;

  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 p-5 sm:p-6 text-white relative overflow-hidden">
        <div className="absolute -right-6 -top-6 text-8xl opacity-20 select-none" aria-hidden>💅🏾</div>
        <div className="flex items-start justify-between gap-3 relative">
          <div>
            <p className="text-sm text-white/80 font-medium">Chicly Beauté</p>
            <h2 className="text-2xl font-extrabold">Prêt pour le lancement : {faites}/{etapes.length}</h2>
          </div>
          <button onClick={charger} title="Actualiser" className="p-2 rounded-xl bg-white/20 hover:bg-white/30">
            <RefreshCw className={`w-4 h-4 ${charge ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/25 overflow-hidden relative">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${(faites / etapes.length) * 100}%` }} />
        </div>
      </div>

      {!!d.erreurs?.length && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/15 p-3 text-xs text-amber-800 dark:text-amber-200">
          Certains chiffres n'ont pas pu être calculés : {d.erreurs.join(' · ')}
        </div>
      )}

      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4">
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {etapes.map((e) => <Etape key={e.titre} {...e} />)}
        </ul>
      </div>

      {offre && (
        <div className="rounded-2xl border border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-900/15 p-4 flex items-center gap-3">
          <span className="text-2xl">🎁</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Offre de lancement : 1 mois Pro offert</p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {offre.places_total - offre.places_restantes} / {offre.places_total} places prises · activé automatiquement à l'inscription d'une pro
            </p>
          </div>
          <span className="text-lg font-extrabold text-pink-600 dark:text-pink-400">{offre.places_restantes} restantes</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Chiffre icone={Images} label="Photos dans le fil" valeur={d.modeles.total}
          sous={`${d.modeles.par_source.pinterest || 0} Pinterest · ${d.modeles.par_source.prestataire || 0} réalisations`} fond="bg-pink-500" />
        <Chiffre icone={Heart} label="Likes (7 jours)" valeur={d.activite.likes_7j}
          sous={`${d.activite.swipes_7j} swipes · ${d.activite.likes_total} likes au total`} fond="bg-rose-500" />
        <Chiffre icone={Scissors} label="« Je sais le faire »" valeur={d.offres.total}
          sous={`par ${d.offres.prestataires} pro(s)`} fond="bg-orange-500" />
        <Chiffre icone={CreditCard} label="Abonnements du mois" valeur={formatCurrency(d.paiements.mois_montant)}
          sous={`${d.paiements.mois_nb} payé(s) en ligne${d.paiements.en_attente ? ` · ${d.paiements.en_attente} en attente` : ''}`} fond="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><UserPlus className="w-4 h-4 text-pink-500" />Nouvelles inscrites (7 jours)</p>
          <div className="flex gap-6 mt-3">
            <div><p className="text-2xl font-extrabold text-gray-900 dark:text-white">{d.activite.nouvelles_clientes_7j}</p><p className="text-xs text-gray-500">clientes</p></div>
            <div><p className="text-2xl font-extrabold text-gray-900 dark:text-white">{d.activite.nouveaux_pros_7j}</p><p className="text-xs text-gray-500">pros</p></div>
          </div>
          <p className="font-semibold text-gray-900 dark:text-white mt-5 mb-2">Photos par catégorie</p>
          <div className="space-y-1.5">
            {Object.entries(CATS).map(([k, label]) => {
              const n = d.modeles.par_categorie[k] || 0;
              const max = Math.max(1, ...Object.values(d.modeles.par_categorie));
              return (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="w-28 text-gray-600 dark:text-gray-300">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden"><div className="h-full bg-pink-400 rounded-full" style={{ width: `${(n / max) * 100}%` }} /></div>
                  <span className="w-6 text-right font-semibold text-gray-700 dark:text-gray-200">{n}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <p className="font-semibold text-gray-900 dark:text-white">🔥 Les plus aimés</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Les tendances du moment chez tes clientes</p>
          <Vignettes modeles={d.plus_aimes} vide="Pas encore de likes : partage l'app pour lancer les swipes !" />
        </div>

        <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800 p-4">
          <p className="font-semibold text-amber-900 dark:text-amber-100">✋ Aimés mais personne ne les propose</p>
          <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mb-3">Demande sans offre : montre ces modèles aux coiffeuses que tu recrutes</p>
          <Vignettes modeles={d.sans_prestataire} vide="Rien à signaler : chaque modèle aimé a au moins une pro." />
        </div>
      </div>
    </section>
  );
}

import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { MapPin, CalendarDays } from 'lucide-react';
import { api, DemandesPro as Donnees, DemandePro } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import { PleinEcran, Vignette, Pastille, PastilleMeches, FilOffres, BarreNegociation, fcfa, quand, erreurDe } from './commun';

const ReservationsRecues = lazy(() => import('../prestataire/ReservationsTab'));

type Onglet = 'nouvelles' | 'en_discussion' | 'acceptees' | 'reservations';
const ONGLETS: [Onglet, string][] = [['nouvelles', 'Nouvelles'], ['en_discussion', 'En discussion'], ['acceptees', 'Acceptées'], ['reservations', 'Réservations']];

/** Menu « Demandes » de la prestataire (maquette 11) + ses réservations reçues. */
export default function DemandesPro({ ouvrirId }: { ouvrirId?: number | null }) {
  const { showToast } = useAppStore();
  const [onglet, setOnglet] = useState<Onglet>('nouvelles');
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [fil, setFil] = useState<number | null>(ouvrirId ?? null);
  const [occupe, setOccupe] = useState<number | null>(null);

  const charger = useCallback(() => api.demandes.pourPro().then(setDonnees).catch(() => setDonnees({ nouvelles: [], en_discussion: [], acceptees: [] })), []);
  useEffect(() => { charger(); const t = setInterval(charger, 20000); return () => clearInterval(t); }, [charger]);
  useEffect(() => { if (ouvrirId) setFil(ouvrirId); }, [ouvrirId]);

  const toutes = donnees ? [...donnees.nouvelles, ...donnees.en_discussion, ...donnees.acceptees] : [];
  const courante = toutes.find((d) => d.id === fil) || null;

  const repondre = async (d: DemandePro, action: 'accepter' | 'refuser' | 'proposer', montant?: number) => {
    setOccupe(d.id);
    try {
      const r = await api.demandes.reponsePro(d.id, action, montant);
      if (action === 'accepter') { showToast(`Demande acceptée pour ${fcfa(r.prix)} : le rendez-vous est dans tes réservations ✨`, 'success'); setFil(null); setOnglet('acceptees'); }
      if (action === 'refuser') { showToast('Demande refusée', 'info'); setFil(null); }
      if (action === 'proposer') { setOnglet('en_discussion'); setFil(d.id); }
      await charger();
      return true;
    } catch (e) {
      showToast(erreurDe(e), 'error');
      charger();
      return false;
    } finally {
      setOccupe(null);
    }
  };

  const liste = donnees && onglet !== 'reservations' ? donnees[onglet] : [];
  const compte = (o: Onglet) => (donnees && o !== 'reservations' ? donnees[o].length : 0);

  return (
    <div>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-5 py-4">
        {ONGLETS.map(([id, label]) => (
          <button key={id} onClick={() => setOnglet(id)}
            className={`flex-shrink-0 px-5 py-2.5 rounded-full text-[15px] font-semibold border transition-colors ${onglet === id ? 'bg-vin-600 border-vin-600 text-white' : 'bg-white dark:bg-gray-900 border-ligne dark:border-gray-700 text-encre dark:text-gray-200'}`}>
            {label}{compte(id) > 0 && <span className={`ml-1.5 ${onglet === id ? 'text-white/80' : 'text-gray-400'}`}>{compte(id)}</span>}
          </button>
        ))}
      </div>

      {onglet === 'reservations' ? (
        <Suspense fallback={<div className="p-8 text-center text-gray-400">Chargement…</div>}><ReservationsRecues /></Suspense>
      ) : (
        <div className="px-5 pb-6 space-y-3">
          {donnees === null ? (
            [0, 1, 2].map((i) => <div key={i} className="h-44 rounded-[24px] bg-sable dark:bg-gray-800 animate-pulse" />)
          ) : liste.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-12 px-4">
              {onglet === 'nouvelles' ? 'Aucune nouvelle demande pour l’instant. Les clientes de ta zone qui demandent un modèle que tu réalises apparaîtront ici.'
                : onglet === 'en_discussion' ? 'Aucune discussion en cours.' : 'Aucune demande acceptée pour l’instant.'}
            </p>
          ) : liste.map((d) => (
            <div key={d.id} className="p-4 rounded-[24px] bg-white dark:bg-gray-900 border border-ligne dark:border-gray-800">
              <button onClick={() => setFil(d.id)} className="w-full flex gap-4 text-left">
                <Vignette modele={d.modele} className="w-[72px] h-[88px]" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-lg font-semibold text-encre dark:text-white truncate first-letter:uppercase">{d.modele.titre}</p>
                  <p className="text-gray-500 dark:text-gray-400 truncate">{d.cliente}</p>
                  <p className="text-encre dark:text-white">
                    <strong className="text-xl">{fcfa(d.accord?.prix ?? d.prix_cliente)}</strong>
                    {d.prix_reference != null && <span className="text-gray-500 text-sm"> Réf. {d.prix_reference.toLocaleString('fr-FR')}</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {d.pour_toi && <Pastille ton="vin">Pour toi</Pastille>}
                    <PastilleMeches meches={d.meches_comprises} />
                    {d.ma_derniere_offre != null && <Pastille ton="vin">Tu proposes {fcfa(d.ma_derniere_offre)}</Pastille>}
                  </div>
                  <p className="text-sm text-gray-500 flex flex-wrap gap-x-3">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{quand(d.date_souhaitee, d.heure_souhaitee)}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-vin-600" />{d.commune}{d.distance_km != null ? ` · ${d.distance_km <= 1 ? 'moins de 1' : d.distance_km} km` : ''}</span>
                  </p>
                </div>
              </button>
              {d.onglet === 'nouvelles' && (
                <div className="grid grid-cols-3 gap-2.5 mt-4">
                  <button onClick={() => repondre(d, 'refuser')} disabled={occupe === d.id} className="py-3 rounded-full border border-ligne dark:border-gray-700 font-semibold text-gray-600 dark:text-gray-300">Refuser</button>
                  <button onClick={() => setFil(d.id)} className="py-3 rounded-full border border-vin-500 font-semibold text-vin-600 dark:text-vin-300">Discuter</button>
                  <button onClick={() => confirm(`Accepter « ${d.modele.titre} » pour ${fcfa(d.prix_cliente)} le ${quand(d.date_souhaitee, d.heure_souhaitee)} ?`) && repondre(d, 'accepter')} disabled={occupe === d.id}
                    className="py-3 rounded-full bg-vin-600 text-white font-semibold disabled:opacity-60">Accepter</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Discussion avec la cliente (maquette 12) */}
      <PleinEcran ouvert={!!courante} onFermer={() => setFil(null)} titre={courante?.cliente || ''}
        sousTitre={courante ? `${courante.modele.titre}${courante.prix_reference ? ` · Réf. ${fcfa(courante.prix_reference)}` : ''}` : ''}
        pied={courante && courante.onglet !== 'acceptees' ? (
          <BarreNegociation occupe={occupe === courante.id}
            // On peut toujours accepter le prix de la cliente, sauf si on attend sa réponse à notre contre-proposition
            accepter={courante.ma_derniere_offre != null ? null : courante.prix_cliente}
            onAccepter={() => repondre(courante, 'accepter')} onRefuser={() => confirm('Refuser cette demande ?') && repondre(courante, 'refuser')}
            onProposer={(m) => repondre(courante, 'proposer', m)} />
        ) : undefined}>
        {courante && (
          <div className="space-y-5">
            <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1"><CalendarDays className="w-4 h-4" />{quand(courante.date_souhaitee, courante.heure_souhaitee)}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4 text-vin-600" />{courante.commune}</span>
            </div>
            {courante.message && <p className="p-4 rounded-[20px] bg-sable dark:bg-gray-800 text-encre dark:text-gray-100">« {courante.message} »</p>}
            <FilOffres offres={courante.offres.length ? courante.offres : [{ auteur: 'cliente', montant: courante.prix_cliente, created_at: courante.created_at }]}
              moi="pro" meches={courante.meches_comprises} derniere={courante.derniere_offre} />
            {courante.accord && (
              <div className="p-4 rounded-[20px] bg-[#E3EDDD] text-[#33502B] dark:bg-emerald-900/20 dark:text-emerald-200">
                Accord à {fcfa(courante.accord.prix)}. Le rendez-vous est dans tes réservations.
              </div>
            )}
          </div>
        )}
      </PleinEcran>
    </div>
  );
}

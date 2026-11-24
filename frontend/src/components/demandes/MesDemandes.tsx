import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Star, ChevronRight, Bell } from 'lucide-react';
import { api, MaDemande, EtatDemande } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import { PleinEcran, Vignette, Pastille, PastilleMeches, FilOffres, BarreNegociation, AugmenterMontant, fcfa, quand, erreurDe, CATEGORIE_LABEL } from './commun';

const ETAT: Record<EtatDemande, { label: string; ton: 'attente' | 'ok' | 'neutre' | 'vin' }> = {
  sans_reponse: { label: 'Sans réponse', ton: 'attente' },
  en_discussion: { label: 'En discussion', ton: 'vin' },
  acceptee: { label: 'Confirmée', ton: 'ok' },
  annulee: { label: 'Annulée', ton: 'neutre' },
  expiree: { label: 'Expirée', ton: 'neutre' },
};

/** Liste des demandes de la cliente (Profil · Demandes, maquette 8). */
export default function MesDemandes({ ouvrirId, onChoisirModele }: { ouvrirId?: number | null; onChoisirModele?: () => void }) {
  const [demandes, setDemandes] = useState<MaDemande[] | null>(null);
  const [ouverte, setOuverte] = useState<number | null>(ouvrirId ?? null);
  const charger = useCallback(() => api.demandes.mesSurModele().then(setDemandes).catch(() => setDemandes([])), []);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { if (ouvrirId) setOuverte(ouvrirId); }, [ouvrirId]);
  // Les réponses arrivent pendant qu'on regarde : on rafraîchit toutes les 20 s
  useEffect(() => { const t = setInterval(charger, 20000); return () => clearInterval(t); }, [charger]);

  const detail = demandes?.find((d) => d.id === ouverte) || null;
  const relance = demandes?.find((d) => d.etat === 'sans_reponse' && d.relance_envoyee);

  return (
    <div className="px-5 py-5 space-y-3">
      {onChoisirModele && (
        <div className="rounded-[24px] border border-dashed border-vin-400 p-5">
          <p className="text-lg font-semibold text-encre dark:text-white">Réserver depuis tes favoris</p>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Choisis une coiffure ou une manucure enregistrée, propose ton prix.</p>
          <button onClick={onChoisirModele} className="mt-4 w-full py-3.5 rounded-full bg-vin-600 text-white font-semibold">Choisir un modèle</button>
        </div>
      )}

      {relance && (
        <button onClick={() => setOuverte(relance.id)} className="w-full flex items-start gap-3 p-4 rounded-[24px] bg-white dark:bg-gray-900 border border-ligne dark:border-gray-800 text-left">
          <span className="w-10 h-10 rounded-xl bg-vin-600 flex items-center justify-center flex-shrink-0"><Bell className="w-5 h-5 text-white" /></span>
          <span>
            <span className="block font-semibold text-encre dark:text-white">Aucune prestataire n’a encore accepté « {relance.modele.titre} »</span>
            <span className="block text-gray-500 dark:text-gray-400 text-sm">Augmente ton montant pour avoir plus de chances.</span>
          </span>
        </button>
      )}

      {demandes === null ? (
        [0, 1].map((i) => <div key={i} className="h-36 rounded-[24px] bg-sable dark:bg-gray-800 animate-pulse" />)
      ) : demandes.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-10">Tu n’as pas encore fait de demande. Ouvre un modèle et touche « Demander cette prestation ».</p>
      ) : demandes.map((d) => {
        const e = ETAT[d.etat];
        const prix = d.accord?.prix ?? d.prix_propose;
        return (
          <div key={d.id} className="flex gap-4 p-4 rounded-[24px] bg-white dark:bg-gray-900 border border-ligne dark:border-gray-800">
            <Vignette modele={d.modele} className="w-[72px] h-[88px]" />
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <p className="text-lg font-semibold text-encre dark:text-white truncate first-letter:uppercase">{d.modele.titre}</p>
                <p className="text-gray-500 dark:text-gray-400 truncate">
                  {d.accord ? d.accord.prestataire.nom_commercial : d.cible ? `Pour ${d.cible.nom_commercial}` : CATEGORIE_LABEL[d.modele.categorie]} · {prix.toLocaleString('fr-FR')} F
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Pastille ton={e.ton}>{d.etat === 'en_discussion' ? `${d.discussions.length} en discussion` : e.label}</Pastille>
              </div>
              <button onClick={() => setOuverte(d.id)} className="px-5 py-2 rounded-full border border-vin-500 text-vin-600 dark:text-vin-300 font-semibold">Voir la demande</button>
            </div>
          </div>
        );
      })}

      <DetailDemande demande={detail} onFermer={() => setOuverte(null)} onChange={charger} />
    </div>
  );
}

/** Une demande : récapitulatif, discussions avec chaque prestataire, augmenter / annuler. */
function DetailDemande({ demande: d, onFermer, onChange }: { demande: MaDemande | null; onFermer: () => void; onChange: () => void }) {
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const [fil, setFil] = useState<number | null>(null); // prestataire dont on ouvre la discussion
  const [augmenter, setAugmenter] = useState(false);
  const [occupe, setOccupe] = useState(false);
  useEffect(() => { setFil(null); }, [d?.id]);

  const discussion = d?.discussions.find((x) => x.prestataire.id === fil) || null;
  const ouverteEncore = d && (d.etat === 'sans_reponse' || d.etat === 'en_discussion');

  const repondre = async (action: 'accepter' | 'refuser' | 'proposer', montant?: number) => {
    if (!d || !discussion) return false;
    setOccupe(true);
    try {
      const r = await api.demandes.reponseCliente(d.id, discussion.prestataire.id, action, montant);
      if (action === 'accepter') showToast(`C’est réservé chez ${discussion.prestataire.nom_commercial} pour ${fcfa(r.prix)} ✨`, 'success');
      if (action === 'refuser') { showToast('Discussion terminée', 'info'); setFil(null); }
      onChange();
      return true;
    } catch (e) {
      showToast(erreurDe(e), 'error');
      return false;
    } finally {
      setOccupe(false);
    }
  };

  const annuler = async () => {
    if (!d || !confirm('Annuler cette demande ? Les prestataires ne la verront plus.')) return;
    try { await api.demandes.annulerSurModele(d.id); showToast('Demande annulée', 'info'); onChange(); onFermer(); } catch (e) { showToast(erreurDe(e), 'error'); }
  };

  return (
    <>
      <PleinEcran ouvert={!!d && !discussion} onFermer={onFermer} titre={d?.modele.titre || ''} sousTitre={d ? `${quand(d.date_souhaitee, d.heure_souhaitee)} · ${d.commune}` : ''}
        pied={ouverteEncore ? (
          <div className="flex gap-3">
            <button onClick={annuler} className="flex-1 py-3.5 rounded-full bg-white dark:bg-gray-900 border border-ligne dark:border-gray-700 font-semibold text-encre dark:text-white">Annuler</button>
            <button onClick={() => setAugmenter(true)} className="flex-[1.8] py-3.5 rounded-full bg-vin-600 text-white font-semibold">Augmenter mon montant</button>
          </div>
        ) : d?.accord?.reservation_id ? (
          <button onClick={() => { onFermer(); navigate('/app/mes-reservations'); }} className="w-full py-4 rounded-full bg-vin-600 text-white text-lg font-semibold">Voir ma réservation</button>
        ) : undefined}>
        {d && (
          <div className="space-y-6">
            <div className="flex gap-4 p-4 rounded-[24px] bg-white dark:bg-gray-900 border border-ligne dark:border-gray-800">
              <Vignette modele={d.modele} className="w-16 h-20" />
              <div className="min-w-0 space-y-1.5">
                <p className="text-gray-500 dark:text-gray-400">{d.accord ? 'Prix convenu' : 'Ton prix'}</p>
                <p className="text-2xl font-bold text-encre dark:text-white">{fcfa(d.accord?.prix ?? d.prix_propose)}</p>
                {d.prix_reference != null && <p className="text-sm text-gray-500">Réf. {d.prix_reference.toLocaleString('fr-FR')}</p>}
                <div className="flex flex-wrap gap-2"><Pastille ton={ETAT[d.etat].ton}>{ETAT[d.etat].label}</Pastille><PastilleMeches meches={d.meches_comprises} /></div>
              </div>
            </div>

            {d.accord && (
              <div className="p-4 rounded-[24px] bg-[#E3EDDD] dark:bg-emerald-900/20 text-[#33502B] dark:text-emerald-200">
                <p className="font-semibold">C’est réservé chez {d.accord.prestataire.nom_commercial}.</p>
                <p className="text-sm mt-0.5">Son adresse et son téléphone sont dans ta réservation.</p>
              </div>
            )}

            {ouverteEncore && (
              <div>
                <h3 className="text-lg font-semibold text-encre dark:text-white mb-3">Réponses des prestataires</h3>
                {d.discussions.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">{d.cible ? `${d.cible.nom_commercial} a été prévenue. Elle peut accepter ton prix directement ou t’en proposer un autre.` : 'Les prestataires proches ont été prévenues. Elles peuvent accepter ton prix directement ou t’en proposer un autre.'}</p>
                ) : (
                  <ul className="space-y-2.5">
                    {d.discussions.map((x) => (
                      <li key={x.prestataire.id}>
                        <button onClick={() => setFil(x.prestataire.id)} className="w-full flex items-center gap-3 p-3.5 rounded-[20px] bg-white dark:bg-gray-900 border border-ligne dark:border-gray-800 text-left">
                          <div className="w-12 h-12 rounded-2xl bg-vin-100 dark:bg-vin-900/40 overflow-hidden flex items-center justify-center text-vin-700 font-semibold flex-shrink-0">
                            {x.prestataire.photo ? <img src={x.prestataire.photo} alt="" className="w-full h-full object-cover" /> : x.prestataire.nom_commercial[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-encre dark:text-white flex items-center gap-1.5 truncate">{x.prestataire.nom_commercial}{x.prestataire.is_verified && <BadgeCheck className="w-4 h-4 text-vin-600" />}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-2">
                              {!!x.prestataire.nombre_avis && <span className="inline-flex items-center gap-0.5"><Star className="w-3.5 h-3.5 fill-encre text-encre" />{(x.prestataire.note_moyenne || 0).toFixed(1)}</span>}
                              {x.prestataire.commune}
                            </p>
                            <p className="text-sm font-semibold text-vin-700 dark:text-vin-300">{x.offre_pro_en_attente != null ? `Propose ${fcfa(x.offre_pro_en_attente)}` : 'Attend sa réponse'}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {d.message && <div><h3 className="font-semibold text-encre dark:text-white mb-1">Ton message</h3><p className="text-gray-600 dark:text-gray-300">{d.message}</p></div>}
          </div>
        )}
      </PleinEcran>

      {/* Discussion avec une prestataire (maquette 12, côté cliente) */}
      <PleinEcran ouvert={!!discussion} onFermer={() => setFil(null)} titre={discussion?.prestataire.nom_commercial || ''}
        sousTitre={d ? `${d.modele.titre}${d.prix_reference ? ` · Réf. ${fcfa(d.prix_reference)}` : ''}` : ''}
        pied={discussion && d ? (
          <BarreNegociation occupe={occupe} accepter={discussion.offre_pro_en_attente}
            onAccepter={() => repondre('accepter')} onRefuser={() => confirm('Terminer la discussion avec cette prestataire ?') && repondre('refuser')}
            onProposer={(m) => repondre('proposer', m)} placeholder="Proposer un autre montant" />
        ) : undefined}>
        {discussion && d && <FilOffres offres={discussion.offres} moi="cliente" meches={d.meches_comprises} derniere={discussion.derniere_offre} />}
      </PleinEcran>

      {d && (
        <AugmenterMontant ouvert={augmenter} onFermer={() => setAugmenter(false)} actuel={d.prix_propose} reference={d.prix_reference}
          onValider={async (prix) => {
            try { await api.demandes.augmenter(d.id, prix); showToast('Ta demande est mise à jour', 'success'); setAugmenter(false); onChange(); }
            catch (e) { showToast(erreurDe(e), 'error'); }
          }} />
      )}
    </>
  );
}

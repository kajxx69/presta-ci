import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Heart, MapPin, Star, BadgeCheck, ChevronRight, ChevronLeft, Scissors, Home, ExternalLink, LocateFixed, Loader2 } from 'lucide-react';
import { api, Modele, DetailModele, OuLeFaire } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import ModeleVisuel from './ModeleVisuel';
import JeSaisLeFaireModal from './JeSaisLeFaireModal';
import ChoixCommune from '../common/ChoixCommune';
import { usePosition, paramsPosition, communeParDefaut } from '../../lib/position';
import { libelleLieu } from '../../lib/communes';
import { useAuthStore } from '../../store/authStore';
import DemandeModeleForm from '../demandes/DemandeModeleForm';

interface Props {
  modele: Modele | null;
  onClose: () => void;
  aime?: boolean;
  onToggleLike?: (m: Modele) => void;
  /** Ouvrir directement « Je sais le faire » (depuis la barre après un like) */
  ouvrirProposition?: boolean;
}

const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;
const duree = (min?: number | null) => (!min ? '' : min < 60 ? `${min} min` : `${Math.round(min / 60 * 10) / 10} h`.replace('.', ','));

function LignePrestataire({ o, onReserver, maCommune }: { o: OuLeFaire; onReserver: () => void; maCommune?: string | null }) {
  const { prestataire: p, service: s } = o;
  const ou = libelleLieu(p, maCommune);
  const domicile = s.is_domicile
    ? p.vient_chez_moi === true ? `Vient chez toi${p.frais_deplacement ? ` · +${p.frais_deplacement.toLocaleString('fr-FR')} F` : ''}`
      : p.vient_chez_moi === false && maCommune ? `À domicile, pas à ${maCommune}` : 'À domicile'
    : null;
  return (
    <button onClick={onReserver}
      className="w-full flex items-center gap-3.5 p-3.5 rounded-[20px] bg-white dark:bg-gray-900 border border-ligne dark:border-gray-800 text-left active:bg-gray-50">
      <div className="w-14 h-14 rounded-2xl bg-vin-100 dark:bg-vin-900/40 overflow-hidden flex-shrink-0 flex items-center justify-center text-vin-700 dark:text-vin-200 text-lg font-semibold">
        {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : (p.nom_commercial || '?')[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-encre dark:text-white flex items-center gap-1.5 min-w-0">
          <span className="truncate">{p.nom_commercial}</span>
          {p.is_verified && <BadgeCheck className="w-4 h-4 text-vin-600 flex-shrink-0" strokeWidth={1.8} />}
          {p.is_pro && <span className="flex-shrink-0 text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded bg-encre text-white">PRO</span>}
        </p>
        {ou && <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1 min-w-0"><MapPin className="w-3.5 h-3.5 flex-shrink-0 text-vin-600" /><span className="truncate">{ou}</span></p>}
        <p className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-x-2.5">
          {!!p.nombre_avis && <span className="inline-flex items-center gap-0.5"><Star className="w-3.5 h-3.5 fill-encre text-encre dark:fill-white dark:text-white" />{(p.note_moyenne || 0).toFixed(1)}</span>}
          {domicile && <span className={`inline-flex items-center gap-1 ${p.vient_chez_moi === true ? 'text-[#3C5A35] dark:text-emerald-400 font-medium' : ''}`}><Home className="w-3.5 h-3.5" />{domicile}</span>}
        </p>
        <p className="mt-0.5 text-encre dark:text-gray-100"><strong>{fcfa(s.prix)}</strong><span className="text-gray-500">{s.duree_minutes ? ` · ${duree(s.duree_minutes)}` : ''}</span></p>
      </div>
      <ChevronRight className="w-5 h-5 flex-shrink-0 text-gray-400" />
    </button>
  );
}

/** Fiche d'un modèle : Réserver chez… / Je sais le faire. */
export default function ModeleDetailSheet({ modele, onClose, aime, onToggleLike, ouvrirProposition }: Props) {
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const [detail, setDetail] = useState<DetailModele | null>(null);
  const [proposer, setProposer] = useState(false);
  const [demander, setDemander] = useState(false);
  const { isAuthenticated } = useAuthStore();
  // « Elle vient chez moi » : seulement les pros qui se déplacent dans ma commune
  const [chezMoi, setChezMoi] = useState(false);
  const { commune, gps, choisi, enCours, choisirCommune, utiliserGPS, oublierGPS } = usePosition();
  const communeAffichee = commune || (choisi ? null : communeParDefaut());
  const maCommune = gps ? null : communeAffichee;

  const charger = useCallback(() => {
    if (!modele) return;
    api.modeles.detail(modele.id, paramsPosition({ commune, gps, choisi }), chezMoi).then(setDetail).catch(() => setDetail(null));
  }, [modele, commune, gps, choisi, chezMoi]);

  const maPosition = async () => {
    if (!(await utiliserGPS())) showToast('Position indisponible. Choisis plutôt ta commune 📍', 'info');
  };

  useEffect(() => {
    setDetail(null);
    setProposer(!!(modele && ouvrirProposition));
    setDemander(false);
  }, [modele, ouvrirProposition]);

  // (Re)charger à l'ouverture et quand la position change
  useEffect(() => { charger(); }, [charger]);

  const reserver = (serviceId: number) => { onClose(); navigate(`/services/${serviceId}`); };
  const monOffre = detail?.mon_offre ? detail.offres.find((o) => o.service.id === detail.mon_offre!.service_id) : null;
  const autres = detail ? detail.offres.filter((o) => o !== monOffre) : [];
  const plusProche = autres.find((o) => o.prestataire.distance_km != null);

  const retirer = async () => {
    if (!modele || !confirm('Ne plus proposer ce modèle ?')) return;
    try { await api.modeles.retirerOffre(modele.id); showToast('Offre retirée', 'info'); charger(); } catch { showToast('Action impossible', 'error'); }
  };

  const prixMin = detail && detail.offres.length ? Math.min(...detail.offres.map((o) => o.service.prix)) : null;
  const categorieLabel = ({ coiffure: 'Coiffure', ongles: 'Ongles', maquillage: 'Maquillage', cils: 'Cils & sourcils', soins: 'Soins' } as Record<string, string>)[modele?.categorie || ''] || '';
  const fiche = detail?.modele;
  const reference = fiche?.prix_reference ?? null;
  const couleurs = fiche?.couleurs || [];
  const conseils = fiche?.conseils_entretien || [];
  const ouvrirDemande = () => {
    if (!isAuthenticated) { onClose(); navigate('/register'); showToast('Crée ton compte pour envoyer ta demande', 'info'); return; }
    if (detail?.ma_demande_id) { onClose(); navigate(`/app/mes-demandes?demande=${detail.ma_demande_id}`); return; }
    setDemander(true);
  };
  const enTete = (t: string) => <h3 className="text-lg font-semibold text-encre dark:text-white mb-3">{t}</h3>;

  return (
    <>
      <AnimatePresence>
        {modele && (
          <motion.div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div className="relative bg-creme dark:bg-gray-950 w-full sm:max-w-md h-[100dvh] sm:h-[92dvh] sm:rounded-[28px] overflow-hidden flex flex-col"
              initial={{ y: 40, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex-1 overflow-y-auto">
                {/* Photo plein cadre */}
                <div className="relative">
                  <ModeleVisuel modele={modele} className="w-full h-[52dvh] sm:h-[46dvh]" />
                  <button onClick={onClose} aria-label="Retour"
                    className="absolute top-4 left-4 w-11 h-11 rounded-full bg-creme/95 border border-ligne flex items-center justify-center z-10">
                    <ChevronLeft className="w-6 h-6 text-encre" strokeWidth={1.8} />
                  </button>
                  {onToggleLike && (
                    <button onClick={() => onToggleLike(modele)} aria-label={aime ? 'Retirer de mes favoris' : 'Ajouter à mes favoris'}
                      className="absolute top-4 right-4 w-11 h-11 rounded-full bg-creme/95 border border-ligne flex items-center justify-center z-10">
                      <Heart className={`w-[22px] h-[22px] text-vin-600 ${aime ? 'fill-vin-600' : ''}`} strokeWidth={1.8} />
                    </button>
                  )}
                  {modele.pin_url && (
                    <a href={modele.pin_url} target="_blank" rel="noreferrer"
                      className="absolute bottom-10 left-4 z-10 inline-flex items-center gap-1 text-[11px] text-white bg-black/45 px-2.5 py-1 rounded-full">
                      Voir sur Pinterest <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Feuille de contenu */}
                <div className="relative -mt-7 rounded-t-[30px] bg-creme dark:bg-gray-950 px-6 pt-6 pb-32 space-y-7">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      {categorieLabel && <span className="px-3.5 py-1.5 rounded-full bg-sable dark:bg-gray-800 text-sm font-medium text-encre dark:text-gray-200">{categorieLabel}</span>}
                      {reference != null ? <span className="text-[15px] text-gray-500 dark:text-gray-400">Prix de référence <strong className="text-encre dark:text-white">{reference.toLocaleString('fr-FR')} F CFA</strong></span>
                        : prixMin != null && <span className="text-[15px] text-gray-500 dark:text-gray-400">À partir de <strong className="text-encre dark:text-white">{fcfa(prixMin)}</strong></span>}
                    </div>
                    <h2 className="mt-4 text-[30px] leading-tight font-bold text-encre dark:text-white first-letter:uppercase">{modele.titre}</h2>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                      {detail === null ? 'Chargement…'
                        : detail.offres.length ? `${detail.offres.length} pro${detail.offres.length > 1 ? 's' : ''} le proposent${plusProche ? ` · la plus proche : ${libelleLieu(plusProche.prestataire, maCommune)}` : ''}`
                          : 'Aucune pro ne le propose encore'}
                    </p>
                  </div>

                  {couleurs.length > 0 && (
                    <div>
                      {enTete(modele.categorie === 'coiffure' ? 'Couleur des mèches' : 'Couleurs possibles')}
                      <div className="flex flex-wrap gap-x-7 gap-y-4">
                        {couleurs.map((c) => (
                          <div key={c.nom} className="flex flex-col items-center gap-2 w-20">
                            <span className="w-12 h-12 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
                            <span className="text-sm text-gray-500 dark:text-gray-400 text-center leading-tight">{c.nom}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {conseils.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-encre dark:text-white pb-3 border-b border-ligne dark:border-gray-800">Conseils d’entretien</h3>
                      <ul>
                        {conseils.map((c) => (
                          <li key={c.critere} className="flex items-center gap-4 py-4 border-b border-ligne dark:border-gray-800 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-[17px] text-encre dark:text-white">{c.critere}</p>
                              <p className="text-gray-500 dark:text-gray-400">{c.conseil}</p>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full border border-ligne dark:border-gray-700 bg-white dark:bg-gray-900 font-medium ${c.statut === 'oui' ? 'text-encre dark:text-white' : 'text-vin-600 dark:text-vin-300'}`}>
                              {c.statut === 'oui' ? 'Oui' : c.statut === 'non' ? 'Non' : 'Prudence'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Réserver chez… (les plus proches d'abord) */}
                  <div id="pros-du-modele">
                    {enTete('Réserver chez')}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {gps ? (
                        <span className="inline-flex items-center gap-1.5 pl-3.5 pr-1.5 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-vin-300 text-vin-700 dark:text-vin-200 text-sm font-medium">
                          <LocateFixed className="w-4 h-4" /> Ma position
                          <button onClick={oublierGPS} aria-label="Ne plus utiliser ma position" className="p-1 rounded-full hover:bg-vin-50"><X className="w-3.5 h-3.5" /></button>
                        </span>
                      ) : (
                        <>
                          <ChoixCommune compact valeur={communeAffichee} onChange={choisirCommune} vide="Ma commune" className="min-w-0 w-40 [&_select]:py-2" />
                          <button onClick={maPosition} disabled={enCours}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white dark:bg-gray-900 border border-ligne dark:border-gray-700 text-sm font-medium text-encre dark:text-gray-200 disabled:opacity-60">
                            {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />} Ma position
                          </button>
                        </>
                      )}
                      <button onClick={() => setChezMoi((v) => !v)} aria-pressed={chezMoi}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-colors ${
                          chezMoi ? 'bg-vin-600 border-vin-600 text-white' : 'bg-white dark:bg-gray-900 border-ligne dark:border-gray-700 text-encre dark:text-gray-200'
                        }`}>
                        <Home className="w-4 h-4" /> Vient chez moi
                      </button>
                    </div>
                    {detail === null ? (
                      <div className="space-y-2.5">{[0, 1].map((i) => <div key={i} className="h-[86px] rounded-[20px] bg-sable dark:bg-gray-800 animate-pulse" />)}</div>
                    ) : autres.length === 0 ? (
                      <div className="rounded-[20px] border border-dashed border-gray-300 dark:border-gray-700 p-5 text-gray-600 dark:text-gray-300">
                        {chezMoi ? (
                          <>
                            Aucune pro ne se déplace {maCommune ? `à ${maCommune}` : 'à domicile'} pour ce modèle pour l'instant.
                            {!!detail.nb_offres_total && <button onClick={() => setChezMoi(false)} className="block mt-2 font-semibold text-vin-600">Voir les {detail.nb_offres_total} pro{detail.nb_offres_total > 1 ? 's' : ''} en salon</button>}
                          </>
                        ) : 'Personne ne propose encore ce modèle. Garde-le dans tes favoris : tu le verras dès qu’une pro se propose.'}
                      </div>
                    ) : (
                      <ul className="space-y-2.5">
                        {autres.map((o) => (
                          <li key={o.prestataire.id}><LignePrestataire o={o} maCommune={maCommune} onReserver={() => reserver(o.service.id)} /></li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {detail && detail.similaires.length > 0 && (
                    <div>
                      {enTete('Styles proches')}
                      <ul className="space-y-2.5">
                        {detail.similaires.map((o) => (
                          <li key={o.prestataire.id}><LignePrestataire o={o} maCommune={maCommune} onReserver={() => reserver(o.service.id)} /></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Pour les pros : se proposer sur ce modèle */}
                  <div className="border-t border-ligne dark:border-gray-800 pt-6">
                    {monOffre ? (
                      <div className="flex items-center gap-3">
                        <Scissors className="w-5 h-5 text-vin-600 flex-shrink-0" strokeWidth={1.8} />
                        <p className="flex-1 text-encre dark:text-gray-100">Tu proposes ce modèle à <strong>{fcfa(monOffre.service.prix)}</strong></p>
                        <button onClick={() => setProposer(true)} className="text-sm font-semibold text-vin-600">Modifier</button>
                        <button onClick={retirer} className="text-sm text-gray-500">Retirer</button>
                      </div>
                    ) : (
                      <button onClick={() => setProposer(true)} className="w-full flex items-center gap-3 text-left">
                        <Scissors className="w-5 h-5 text-vin-600 flex-shrink-0" strokeWidth={1.8} />
                        <span className="flex-1">
                          <span className="block font-semibold text-encre dark:text-white">Tu sais réaliser ce modèle ?</span>
                          <span className="block text-sm text-gray-500 dark:text-gray-400">Propose-le et reçois des réservations</span>
                        </span>
                        <span className="px-4 py-2 rounded-full border border-vin-500 text-sm font-semibold text-vin-600 dark:text-vin-300">Je sais le faire</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action principale fixe en bas (maquette) */}
              <div className="absolute inset-x-0 bottom-0 px-6 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-gradient-to-t from-creme via-creme to-creme/0 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950/0">
                <button onClick={ouvrirDemande} disabled={detail === null}
                  className={`w-full py-4 rounded-full text-lg font-semibold disabled:opacity-60 ${detail?.ma_demande_id ? 'bg-white dark:bg-gray-900 border border-vin-500 text-vin-600 dark:text-vin-300' : 'bg-vin-600 hover:bg-vin-700 text-white'}`}>
                  {detail?.ma_demande_id ? 'Voir ma demande' : 'Demander cette prestation'}
                </button>
                {detail?.ma_demande_id && <p className="mt-2 text-center text-xs text-gray-500">Tu as une demande en cours pour ce modèle</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DemandeModeleForm modele={demander && fiche ? fiche : null} onFermer={() => setDemander(false)}
        onEnvoyee={(id, n) => {
          setDemander(false);
          showToast(n ? `Demande envoyée à ${n} prestataire${n > 1 ? 's' : ''} proche${n > 1 ? 's' : ''} ✨` : 'Demande envoyée ✨', 'success');
          onClose();
          navigate(`/app/mes-demandes?demande=${id}`);
        }} />

      <JeSaisLeFaireModal
        modele={proposer ? modele : null}
        onClose={() => setProposer(false)}
        offreActuelle={monOffre ? { prix: monOffre.service.prix, duree_minutes: monOffre.service.duree_minutes, is_domicile: monOffre.service.is_domicile } : null}
        onFait={charger}
      />
    </>
  );
}

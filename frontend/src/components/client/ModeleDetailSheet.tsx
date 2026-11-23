import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Heart, MapPin, Star, BadgeCheck, ChevronRight, Scissors, Home, ExternalLink, LocateFixed, Loader2 } from 'lucide-react';
import { api, Modele, DetailModele, OuLeFaire } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import ModeleVisuel from './ModeleVisuel';
import JeSaisLeFaireModal from './JeSaisLeFaireModal';
import ChoixCommune from '../common/ChoixCommune';
import { usePosition, paramsPosition, communeParDefaut } from '../../lib/position';
import { formatDistance } from '../../lib/communes';

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

/** « 1,2 km · Cocody », « Dans ta commune », ou la ville saisie par la pro. */
function lieu(p: OuLeFaire['prestataire']): string | null {
  const lieuTexte = p.commune || p.ville || null;
  if (p.distance_approx && p.distance_km != null && p.distance_km < 0.5) return p.commune ? `Dans ta commune · ${p.commune}` : 'Dans ta commune';
  const d = formatDistance(p.distance_km, p.distance_approx);
  return d ? [d, lieuTexte].filter(Boolean).join(' · ') : lieuTexte;
}

function LignePrestataire({ o, onReserver }: { o: OuLeFaire; onReserver: () => void }) {
  const { prestataire: p, service: s } = o;
  const ou = lieu(p);
  return (
    <button onClick={onReserver}
      className="w-full flex items-center gap-3 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 overflow-hidden flex-shrink-0 flex items-center justify-center text-white font-bold">
        {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : (p.nom_commercial || '?')[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1 min-w-0">
          <span className="truncate">{p.nom_commercial}</span>{p.is_verified && <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />}
          {p.is_pro && <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 text-white">PRO ✨</span>}
        </p>
        {ou && <p className={`text-xs flex items-center gap-0.5 min-w-0 ${p.distance_km != null ? 'text-pink-700 dark:text-pink-300 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}><MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{ou}</span></p>}
        <p className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-x-2">
          {!!p.nombre_avis && <span className="inline-flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{(p.note_moyenne || 0).toFixed(1)}</span>}
          {s.is_domicile && <span className="inline-flex items-center gap-0.5"><Home className="w-3 h-3" />à domicile</span>}
        </p>
        <p className="text-sm text-gray-800 dark:text-gray-200"><strong>{fcfa(s.prix)}</strong>{s.duree_minutes ? ` · ${duree(s.duree_minutes)}` : ''}</p>
      </div>
      <span className="flex-shrink-0 flex items-center text-sm font-semibold text-pink-600">Réserver<ChevronRight className="w-4 h-4" /></span>
    </button>
  );
}

/** Fiche d'un modèle : Réserver chez… / Je sais le faire. */
export default function ModeleDetailSheet({ modele, onClose, aime, onToggleLike, ouvrirProposition }: Props) {
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const [detail, setDetail] = useState<DetailModele | null>(null);
  const [proposer, setProposer] = useState(false);
  const { commune, gps, enCours, choisirCommune, utiliserGPS, oublierGPS } = usePosition();
  const communeAffichee = commune || communeParDefaut();

  const charger = useCallback(() => {
    if (!modele) return;
    api.modeles.detail(modele.id, paramsPosition({ commune, gps })).then(setDetail).catch(() => setDetail(null));
  }, [modele, commune, gps]);

  const maPosition = async () => {
    if (!(await utiliserGPS())) showToast('Position indisponible. Choisis plutôt ta commune 📍', 'info');
  };

  useEffect(() => {
    setDetail(null);
    setProposer(!!(modele && ouvrirProposition));
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

  return (
    <>
      <AnimatePresence>
        {modele && (
          <motion.div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div className="bg-white dark:bg-gray-900 w-full sm:max-w-md max-h-[94dvh] rounded-t-3xl sm:rounded-3xl overflow-y-auto"
              initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <ModeleVisuel modele={modele} className="w-full aspect-[4/5]" />
                <button onClick={onClose} aria-label="Fermer" className="absolute top-3 right-3 p-2 rounded-full bg-black/40 text-white backdrop-blur z-10"><X className="w-5 h-5" /></button>
                {onToggleLike && (
                  <button onClick={() => onToggleLike(modele)} aria-label={aime ? 'Retirer de mes favoris' : 'Ajouter à mes favoris'}
                    className="absolute bottom-3 right-3 p-3 rounded-full bg-white/90 shadow-lg z-10">
                    <Heart className={`w-6 h-6 ${aime ? 'fill-pink-500 text-pink-500' : 'text-gray-700'}`} />
                  </button>
                )}
                {modele.pin_url && (
                  <a href={modele.pin_url} target="_blank" rel="noreferrer"
                    className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1 text-[11px] text-white/90 bg-black/50 px-2 py-1 rounded-full backdrop-blur">
                    Voir sur Pinterest <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white first-letter:uppercase">{modele.titre}</h2>
                  {detail && detail.offres.length > 0 && (
                    <p className="text-pink-600 font-semibold mt-0.5">
                      {detail.offres.length} prestataire{detail.offres.length > 1 ? 's' : ''} · dès {fcfa(Math.min(...detail.offres.map((o) => o.service.prix)))}
                    </p>
                  )}
                  {plusProche && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-pink-600" />
                      La plus proche : <strong className="text-gray-900 dark:text-white">{lieu(plusProche.prestataire)}</strong>
                    </p>
                  )}
                </div>

                {/* Je sais le faire / mon offre */}
                {monOffre ? (
                  <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/15 p-3 flex items-center gap-3">
                    <Scissors className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <p className="flex-1 text-sm text-amber-900 dark:text-amber-100">Tu proposes ce modèle à <strong>{fcfa(monOffre.service.prix)}</strong></p>
                    <button onClick={() => setProposer(true)} className="text-sm font-semibold text-amber-700 dark:text-amber-300">Modifier</button>
                    <button onClick={retirer} className="text-sm text-gray-500">Retirer</button>
                  </div>
                ) : (
                  <button onClick={() => setProposer(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-left shadow-md">
                    <span className="text-2xl">✋</span>
                    <span className="flex-1">
                      <span className="block font-bold">Je sais le faire</span>
                      <span className="block text-xs text-white/85">Propose ce modèle et reçois des réservations</span>
                    </span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}

                {/* Réserver chez… (les plus proches d'abord) */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Réserver ce modèle chez</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">Près de</span>
                    {gps ? (
                      <span className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 text-sm font-medium">
                        <LocateFixed className="w-3.5 h-3.5" /> Ma position
                        <button onClick={oublierGPS} aria-label="Ne plus utiliser ma position" className="p-1 rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/40"><X className="w-3.5 h-3.5" /></button>
                      </span>
                    ) : (
                      <>
                        <ChoixCommune compact valeur={communeAffichee} onChange={choisirCommune} vide="Ma commune ?" className="min-w-0 flex-1 max-w-[11rem]" />
                        <button onClick={maPosition} disabled={enCours}
                          className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 disabled:opacity-60">
                          {enCours ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />} Ma position
                        </button>
                      </>
                    )}
                  </div>
                  {detail === null ? (
                    <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
                  ) : autres.length === 0 ? (
                    <p className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300">
                      Personne ne propose encore ce modèle. Ajoute-le à tes favoris : tu seras parmi les premières à le voir dès qu'une coiffeuse se propose.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {autres.map((o) => (
                        <li key={o.prestataire.id}><LignePrestataire o={o} onReserver={() => reserver(o.service.id)} /></li>
                      ))}
                    </ul>
                  )}
                </div>

                {detail && detail.similaires.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Ils font des styles proches</h3>
                    <ul className="space-y-2">
                      {detail.similaires.map((o) => (
                        <li key={o.prestataire.id}><LignePrestataire o={o} onReserver={() => reserver(o.service.id)} /></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <JeSaisLeFaireModal
        modele={proposer ? modele : null}
        onClose={() => setProposer(false)}
        offreActuelle={monOffre ? { prix: monOffre.service.prix, duree_minutes: monOffre.service.duree_minutes, is_domicile: monOffre.service.is_domicile } : null}
        onFait={charger}
      />
    </>
  );
}

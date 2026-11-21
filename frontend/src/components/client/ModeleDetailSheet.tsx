import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Heart, MapPin, Star, BadgeCheck, ChevronRight, Search } from 'lucide-react';
import { api, Modele, OuLeFaire } from '../../lib/api';

interface Props {
  modele: Modele | null;
  onClose: () => void;
  aime?: boolean;
  onToggleLike?: (m: Modele) => void;
}

const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

/** Fiche plein écran d'un modèle : grande photo + « Où le faire ? » */
export default function ModeleDetailSheet({ modele, onClose, aime, onToggleLike }: Props) {
  const navigate = useNavigate();
  const [ou, setOu] = useState<OuLeFaire[] | null>(null);

  useEffect(() => {
    if (!modele) return;
    setOu(null);
    api.modeles.detail(modele.id).then((d) => setOu(d.ou_le_faire)).catch(() => setOu([]));
  }, [modele]);

  return (
    <AnimatePresence>
      {modele && (
        <motion.div
          className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-gray-900 w-full sm:max-w-md max-h-[94dvh] rounded-t-3xl sm:rounded-3xl overflow-y-auto"
            initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img src={modele.photo_url} alt={modele.titre} className="w-full aspect-[4/5] object-cover" />
              <button onClick={onClose} aria-label="Fermer" className="absolute top-3 right-3 p-2 rounded-full bg-black/40 text-white backdrop-blur">
                <X className="w-5 h-5" />
              </button>
              {onToggleLike && (
                <button
                  onClick={() => onToggleLike(modele)}
                  aria-label={aime ? 'Retirer de mes favoris' : 'Ajouter à mes favoris'}
                  className="absolute bottom-3 right-3 p-3 rounded-full bg-white/90 shadow-lg"
                >
                  <Heart className={`w-6 h-6 ${aime ? 'fill-pink-500 text-pink-500' : 'text-gray-700'}`} />
                </button>
              )}
              {modele.credit_nom && (
                <a href={modele.credit_url || undefined} target="_blank" rel="noreferrer"
                   className="absolute bottom-3 left-3 text-[11px] text-white/90 bg-black/40 px-2 py-1 rounded-full backdrop-blur">
                  📷 {modele.credit_nom}
                </a>
              )}
            </div>

            <div className="p-5 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white first-letter:uppercase">{modele.titre}</h2>
                {modele.prix ? <p className="text-pink-600 font-semibold mt-1">{fcfa(modele.prix)}{modele.ville ? ` · ${modele.ville}` : ''}</p> : null}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Où le faire ?</h3>
                {ou === null ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
                  </div>
                ) : ou.length === 0 ? (
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300">
                    Aucun salon ne propose encore ce style sur PrestaCI.
                    <button
                      onClick={() => { onClose(); navigate(`/app/search?q=${encodeURIComponent(modele.categorie)}`); }}
                      className="mt-2 flex items-center gap-1 text-pink-600 font-semibold"
                    >
                      <Search className="w-4 h-4" /> Voir des modèles proposés près de chez toi
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {ou.map(({ prestataire: p, service: s }) => (
                      <li key={p.id}>
                        <button
                          onClick={() => { onClose(); navigate(`/services/${s.id}`); }}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 overflow-hidden flex-shrink-0 flex items-center justify-center text-white font-bold">
                            {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : (p.nom_commercial || '?')[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1">
                              {p.nom_commercial}
                              {p.is_verified && <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-2">
                              {p.ville && <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" />{p.ville}</span>}
                              {!!p.nombre_avis && <span className="inline-flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{(p.note_moyenne || 0).toFixed(1)}</span>}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{s.nom} · <strong>{fcfa(s.prix)}</strong></p>
                          </div>
                          <span className="flex items-center text-sm font-semibold text-pink-600">Réserver<ChevronRight className="w-4 h-4" /></span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

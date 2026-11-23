import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as IconeCarte, RefreshCw, Users, Scissors, Home, Heart, CalendarCheck, AlertTriangle } from 'lucide-react';
import { api, CarteCommunes, LigneCommune, StatutCommune } from '../../lib/api';

const STATUTS: Record<StatutCommune, { label: string; couleur: string; fond: string; ordre: number }> = {
  manque_pros: { label: 'Manque de pros', couleur: '#E11D48', fond: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300', ordre: 0 },
  manque_clientes: { label: 'Manque de clientes', couleur: '#D97706', fond: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300', ordre: 1 },
  equilibre: { label: 'Équilibré', couleur: '#059669', fond: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300', ordre: 2 },
  a_lancer: { label: 'À lancer', couleur: '#9CA3AF', fond: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300', ordre: 3 },
};
const CENTRE_ABIDJAN: [number, number] = [5.34, -4.0];

/** Recentre la carte quand on change de zone (Abidjan / tout le pays). */
function Cadrage({ lignes, abidjan }: { lignes: LigneCommune[]; abidjan: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (abidjan) map.setView(CENTRE_ABIDJAN, 11);
    else map.fitBounds(lignes.map((l) => [l.lat, l.lng] as [number, number]), { padding: [30, 30] });
  }, [abidjan, lignes, map]);
  return null;
}

const rayon = (l: LigneCommune) => Math.min(38, 7 + Math.sqrt(l.clientes_actives * 4 + l.pros_actives * 6) * 3);

export default function AdminCarteCommunes() {
  const [d, setD] = useState<CarteCommunes | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [abidjan, setAbidjan] = useState(true);
  const [voirTout, setVoirTout] = useState(false);

  const charger = () => {
    setChargement(true);
    api.modeles.admin.carteCommunes()
      .then((r) => { setD(r); setErreur(null); })
      .catch((e) => setErreur(e?.message || 'Erreur'))
      .finally(() => setChargement(false));
  };
  useEffect(() => { charger(); }, []);

  const lignes = useMemo(() => {
    if (!d) return [];
    return d.communes
      .filter((l) => !abidjan || l.zone === 'Abidjan')
      .sort((a, b) => STATUTS[a.statut].ordre - STATUTS[b.statut].ordre || (b.clientes_actives + b.pros_actives) - (a.clientes_actives + a.pros_actives));
  }, [d, abidjan]);
  const compte = (s: StatutCommune) => lignes.filter((l) => l.statut === s).length;
  const actives = lignes.filter((l) => l.statut !== 'a_lancer');
  const aLancer = lignes.filter((l) => l.statut === 'a_lancer');

  if (erreur) return (
    <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300">
      Impossible de charger la carte. <button onClick={charger} className="font-semibold underline">Réessayer</button>
      <p className="text-xs mt-1 opacity-75">Détail : {erreur}</p>
    </div>
  );
  if (!d) return <div className="h-96 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><IconeCarte className="w-5 h-5 text-[#7A1638]" /> Carte des communes</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">La demande des clientes face aux pros, sur les {d.periode_jours} derniers jours. Où recruter, où partager tes visuels.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 p-1 text-sm font-semibold">
            {[true, false].map((v) => (
              <button key={String(v)} onClick={() => setAbidjan(v)}
                className={`px-3 py-1.5 rounded-full ${abidjan === v ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                {v ? 'Abidjan' : 'Tout le pays'}
              </button>
            ))}
          </div>
          <button onClick={charger} aria-label="Actualiser" className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
            <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${chargement ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(['manque_pros', 'manque_clientes', 'equilibre', 'a_lancer'] as StatutCommune[]).map((s) => (
          <div key={s} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUTS[s].couleur }} />{STATUTS[s].label}
            </p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{compte(s)} <span className="text-sm font-medium text-gray-400">commune{compte(s) > 1 ? 's' : ''}</span></p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 relative z-0">
        <MapContainer center={CENTRE_ABIDJAN} zoom={11} scrollWheelZoom={false} style={{ height: 420, width: '100%' }}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Cadrage lignes={lignes} abidjan={abidjan} />
          {lignes.map((l) => (
            <CircleMarker key={l.commune} center={[l.lat, l.lng]} radius={rayon(l)}
              eventHandlers={{ click: () => document.getElementById(`commune-${l.commune}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}
              pathOptions={{ color: STATUTS[l.statut].couleur, fillColor: STATUTS[l.statut].couleur, fillOpacity: l.statut === 'a_lancer' ? 0.15 : 0.5, weight: 2 }}>
              <Tooltip direction="top" className="!text-xs">
                <strong>{l.commune}</strong> · {STATUTS[l.statut].label}<br />
                {l.clientes_actives} cliente{l.clientes_actives > 1 ? 's' : ''} active{l.clientes_actives > 1 ? 's' : ''} · {l.pros_actives} pro{l.pros_actives > 1 ? 's' : ''}
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
        <div className="absolute bottom-2 left-2 z-[400] rounded-xl bg-white/90 dark:bg-gray-900/90 px-2.5 py-1.5 text-[11px] text-gray-600 dark:text-gray-300 shadow">
          Taille du cercle = activité · touche un cercle pour le détail
        </div>
      </div>

      {(d.sans_commune.comptes > 0 || d.sans_commune.pros > 0) && (
        <p className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2 rounded-2xl bg-amber-50 dark:bg-amber-900/15 p-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <span><strong>{d.sans_commune.comptes}</strong> compte(s) et <strong>{d.sans_commune.pros}</strong> pro(s) n'ont pas encore de commune : ils n'apparaissent pas sur la carte.</span>
        </p>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Priorités</h3>
        {actives.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Aucune activité encore dans ces communes.</p>}
        {actives.map((l) => (
          <div key={l.commune} id={`commune-${l.commune}`} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 scroll-mt-20">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-gray-900 dark:text-white">{l.commune}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUTS[l.statut].fond}`}>{STATUTS[l.statut].label}</span>
              {l.zone !== 'Abidjan' && <span className="text-xs text-gray-400">{l.zone}</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
              <span className="inline-flex items-center gap-1" title="Clientes actives (ont aimé un modèle)"><Users className="w-4 h-4 text-gray-400" />{l.clientes_actives} active{l.clientes_actives > 1 ? 's' : ''} / {l.clientes} inscrite{l.clientes > 1 ? 's' : ''}</span>
              <span className="inline-flex items-center gap-1"><Heart className="w-4 h-4 text-pink-500" />{l.likes}{l.top_categorie ? ` · surtout ${l.top_categorie}` : ''}</span>
              <span className="inline-flex items-center gap-1" title="Pros avec au moins une prestation active"><Scissors className="w-4 h-4 text-gray-400" />{l.pros_actives} pro{l.pros_actives > 1 ? 's' : ''} active{l.pros_actives > 1 ? 's' : ''}{l.pros > l.pros_actives ? ` (+${l.pros - l.pros_actives} inactive${l.pros - l.pros_actives > 1 ? 's' : ''})` : ''}</span>
              <span className="inline-flex items-center gap-1" title="Pros qui viennent à domicile ici"><Home className="w-4 h-4 text-emerald-500" />{l.pros_domicile} à domicile</span>
              <span className="inline-flex items-center gap-1"><CalendarCheck className="w-4 h-4 text-gray-400" />{l.reservations} résa</span>
            </div>
            <p className="mt-2 text-sm font-medium" style={{ color: STATUTS[l.statut].couleur }}>→ {l.conseil}</p>
          </div>
        ))}
        {aLancer.length > 0 && (
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4 text-sm text-gray-600 dark:text-gray-300">
            <p><strong>À lancer ({aLancer.length})</strong> : {voirTout || aLancer.length <= 8 ? aLancer.map((l) => l.commune).join(', ') : `${aLancer.slice(0, 8).map((l) => l.commune).join(', ')}…`}
              {!voirTout && aLancer.length > 8 && <button onClick={() => setVoirTout(true)} className="ml-1 font-semibold text-pink-600">voir tout</button>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

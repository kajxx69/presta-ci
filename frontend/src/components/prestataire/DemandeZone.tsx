import { useEffect, useState } from 'react';
import { MapPin, TrendingUp, TrendingDown, Lock, Crown, ChevronRight } from 'lucide-react';
import { api, DemandeZone as Demande, Modele } from '../../lib/api';
import ModeleVisuel from '../client/ModeleVisuel';
import ModeleDetailSheet from '../client/ModeleDetailSheet';

const NOMS: Record<string, string> = { coiffure: 'coiffures', ongles: 'ongles', maquillage: 'make-up', cils: 'cils & sourcils', soins: 'soins' };
const EMOJI: Record<string, string> = { coiffure: '💇🏾‍♀️', ongles: '💅🏾', maquillage: '💄', cils: '👁️', soins: '🧖🏾‍♀️' };

/** Pro : « 42 femmes de Cocody ont aimé des tresses cette semaine » + modèles à proposer. */
export default function DemandeZone({ onNavigateToTab }: { onNavigateToTab: (tab: string) => void }) {
  const [d, setD] = useState<Demande | null>(null);
  const [erreur, setErreur] = useState(false);
  const [ouvert, setOuvert] = useState<{ modele: Modele; proposer: boolean } | null>(null);

  const charger = () => api.modeles.demandeZone().then((r) => { setD(r); setErreur(false); }).catch(() => setErreur(true));
  useEffect(() => { charger(); }, []);

  if (erreur) return null;
  if (!d) return <div className="h-40 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />;

  const zone = d.zones.length === 1 ? `à ${d.zones[0]}` : d.zones.length ? `dans ta zone (${d.zones.join(', ')})` : null;
  const evolution = d.clientes - d.clientes_semaine_precedente;
  const top = d.par_categorie[0];

  return (
    <section className="rounded-3xl overflow-hidden border border-[#7A1638]/15 dark:border-pink-300/20 bg-white dark:bg-gray-900 shadow-sm">
      <div className="p-5 bg-gradient-to-br from-[#7A1638] to-[#A3214F] text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-white/70 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" /> La demande {zone || 'près de toi'} · 7 jours
        </p>
        {!zone ? (
          <p className="mt-2 text-lg font-bold">Indique ta commune dans ton profil pour voir ce que les clientes près de toi aiment.</p>
        ) : d.clientes === 0 ? (
          <p className="mt-2 text-lg font-bold leading-snug">Pas encore de coups de cœur cette semaine à {d.zones.length === 1 ? d.zones[0] : 'ta zone'}. Partage ton profil pour lancer le mouvement ✨</p>
        ) : (
          <>
            <p className="mt-2 text-2xl font-extrabold leading-tight">
              {d.clientes} femme{d.clientes > 1 ? 's' : ''} {d.zones.length === 1 ? `de ${d.zones[0]}` : 'de ta zone'} {d.clientes > 1 ? 'ont' : 'a'} aimé des modèles
              {top ? <> — surtout des <span className="text-pink-200">{NOMS[top.categorie] || top.categorie}</span></> : ''}
            </p>
            {d.clientes_semaine_precedente > 0 && evolution !== 0 && (
              <p className="mt-1.5 text-sm text-white/85 inline-flex items-center gap-1">
                {evolution > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {evolution > 0 ? '+' : ''}{evolution} par rapport à la semaine dernière
              </p>
            )}
          </>
        )}
      </div>

      {d.par_categorie.length > 0 && (
        <div className="px-5 pt-4 flex flex-wrap gap-2">
          {d.par_categorie.map((c) => (
            <span key={c.categorie} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200">
              {EMOJI[c.categorie]} {NOMS[c.categorie] || c.categorie} · <strong>{c.likes}</strong> ❤️
            </span>
          ))}
        </div>
      )}

      {d.top_modeles.length > 0 && (
        <div className="p-5 space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Les plus aimés autour de toi</h3>
          {d.top_modeles.map(({ modele, clientes, je_le_propose }, i) => (
            <button key={modele.id} onClick={() => setOuvert({ modele, proposer: !je_le_propose })}
              className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
              <span className="w-5 text-center font-bold text-gray-400">{i + 1}</span>
              <div className="w-12 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0"><ModeleVisuel modele={modele} compact className="w-full h-full" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate first-letter:uppercase">{modele.titre}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">❤️ {clientes} cliente{clientes > 1 ? 's' : ''} près de toi</p>
              </div>
              {je_le_propose ? (
                <span className="text-xs font-semibold text-emerald-600 flex-shrink-0">✓ Tu le proposes</span>
              ) : (
                <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold">✋ Je sais le faire</span>
              )}
            </button>
          ))}

          {!d.est_pro && (
            <button onClick={() => onNavigateToTab('plans')}
              className="w-full mt-1 flex items-center gap-3 p-3 rounded-2xl border border-dashed border-[#7A1638]/30 dark:border-pink-300/30 bg-[#7A1638]/5 dark:bg-pink-300/5 text-left">
              <Lock className="w-5 h-5 text-[#7A1638] dark:text-pink-300 flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">
                {d.top_masques > 0
                  ? <>Encore <strong>{d.top_masques} modèle{d.top_masques > 1 ? 's' : ''}</strong> que les clientes de ta zone adorent. </>
                  : <>Le classement complet de ta zone chaque semaine. </>}
                <strong className="text-[#7A1638] dark:text-pink-300">Passe Pro pour les voir</strong>
              </span>
              <Crown className="w-5 h-5 text-amber-500 flex-shrink-0" /><ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      )}

      <ModeleDetailSheet modele={ouvert?.modele || null} ouvrirProposition={ouvert?.proposer} onClose={() => { setOuvert(null); charger(); }} />
    </section>
  );
}

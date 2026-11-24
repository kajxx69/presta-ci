import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api, FicheModele } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import { usePosition, communeParDefaut } from '../../lib/position';
import ChoixCommune from '../common/ChoixCommune';
import { useAuthStore } from '../../store/authStore';
import { PleinEcran, Vignette, fcfa, lireMontant, ecrireMontant, erreurDe } from './commun';

const demain = () => { const d = new Date(Date.now() + 86400_000); return d.toISOString().slice(0, 10); };
const HEURES = Array.from({ length: 27 }, (_, i) => `${String(7 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`); // 07:00 → 20:00

/** « Ma demande » (maquette 10) : la cliente propose son prix pour un modèle. */
/** Prestataire visée (« Proposer mon prix » depuis sa ligne) ; absente = toutes les pros proches. */
export interface CibleDemande { id: number; nom: string; prix: number }

export default function DemandeModeleForm({ modele, cible, onFermer, onEnvoyee }: {
  modele: FicheModele | null; cible?: CibleDemande | null; onFermer: () => void; onEnvoyee: (id: number, notifiees: number) => void;
}) {
  const { showToast } = useAppStore();
  const { commune: maCommune } = usePosition();
  const communeCompte = (useAuthStore((s) => s.user) as any)?.commune as string | undefined;
  const reference = modele?.prix_reference ?? null;
  const coiffure = modele?.categorie === 'coiffure';
  const [prix, setPrix] = useState(0);
  const [meches, setMeches] = useState<boolean | null>(null);
  const [date, setDate] = useState(demain());
  const [heure, setHeure] = useState('10:00');
  const [commune, setCommune] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!modele) return;
    // À une pro précise : on part de son prix ; à toutes : un peu sous le prix de référence
    setPrix(cible ? cible.prix : reference ? Math.round(reference * 0.8 / 500) * 500 : 0);
    setMeches(modele.categorie === 'coiffure' ? false : null);
    setCommune(maCommune || communeCompte || communeParDefaut());
    setMessage('');
  }, [modele?.id, cible?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const manque = !prix ? 'Indique ton prix' : !commune ? 'Choisis ta commune' : !date ? 'Choisis la date' : null;

  const envoyer = async () => {
    if (!modele || manque) { if (manque) showToast(manque, 'info'); return; }
    setEnvoi(true);
    try {
      const r = await api.demandes.creerSurModele({ modele_id: modele.id, prestataire_id: cible?.id, prix_propose: prix, meches_comprises: coiffure ? meches : null, date_souhaitee: date, heure_souhaitee: heure, commune: commune!, message: message.trim() || undefined });
      onEnvoyee(r.id, r.prestataires_notifies);
    } catch (e) {
      showToast(erreurDe(e, 'Impossible d’envoyer la demande'), 'error');
    } finally {
      setEnvoi(false);
    }
  };

  const champ = 'w-full px-5 py-4 rounded-[20px] bg-white dark:bg-gray-900 border border-ligne dark:border-gray-700 text-encre dark:text-white focus:outline-none focus:border-vin-400';
  const label = 'block font-semibold text-encre dark:text-white mb-2.5';

  return (
    <PleinEcran ouvert={!!modele} onFermer={onFermer} titre={cible ? `Ma demande à ${cible.nom}` : 'Ma demande'}
      pied={
        <button onClick={envoyer} disabled={envoi} className="w-full py-4 rounded-full bg-vin-600 text-white text-lg font-semibold disabled:opacity-60">
          {envoi ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Envoyer ma demande'}
        </button>
      }>
      {modele && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-[24px] bg-white dark:bg-gray-900 border border-ligne dark:border-gray-800">
            <Vignette modele={modele} className="w-14 h-16" />
            <div className="min-w-0">
              <p className="text-lg font-semibold text-encre dark:text-white truncate first-letter:uppercase">{modele.titre}</p>
              {cible ? (
                <><p className="text-gray-500 dark:text-gray-400">Son prix</p><p className="font-bold text-encre dark:text-white">{fcfa(cible.prix)}</p></>
              ) : reference != null ? (
                <><p className="text-gray-500 dark:text-gray-400">Prix de référence</p><p className="font-bold text-encre dark:text-white">{fcfa(reference)}</p></>
              ) : <p className="text-gray-500 dark:text-gray-400">Propose le prix qui te convient</p>}
            </div>
          </div>

          <div>
            <label htmlFor="prix" className={label}>Ton prix</label>
            <div className="relative">
              <input id="prix" inputMode="numeric" value={ecrireMontant(prix)} onChange={(e) => setPrix(lireMontant(e.target.value))} placeholder="20 000"
                className={`${champ} text-2xl font-bold pr-24`} />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-encre dark:text-white pointer-events-none">F CFA</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-2">{cible ? `${cible.nom} voit ton prix : elle peut l’accepter ou te proposer le sien.` : 'Les prestataires voient ton prix et peuvent le discuter.'}</p>
          </div>

          {coiffure && (
            <div>
              <p className={label}>Mèches comprises dans le prix ?</p>
              <div className="grid grid-cols-2 p-1.5 rounded-full bg-sable dark:bg-gray-800">
                {([true, false] as const).map((v) => (
                  <button key={String(v)} onClick={() => setMeches(v)}
                    className={`py-3 rounded-full text-lg font-semibold transition-colors ${meches === v ? 'bg-white dark:bg-gray-900 text-encre dark:text-white shadow-sm' : 'text-gray-500'}`}>
                    {v ? 'Oui' : 'Non'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="date" className={label}>Date</label>
              <input id="date" type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} className={`${champ} py-3.5`} />
            </div>
            <div>
              <label htmlFor="heure" className={label}>Heure</label>
              <select id="heure" value={heure} onChange={(e) => setHeure(e.target.value)} className={`${champ} py-3.5 appearance-none`}>
                {HEURES.map((h) => <option key={h} value={h}>{h.replace(':', 'h')}</option>)}
              </select>
            </div>
          </div>

          <div>
            <p className={label}>Ta commune</p>
            <ChoixCommune valeur={commune} onChange={setCommune} className="[&_select]:py-4 [&_select]:rounded-[20px] [&_select]:text-base" />
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">{cible ? 'Ton adresse exacte reste privée jusqu’à la confirmation.' : 'Les prestataires proches sont prévenues en premier. Ton adresse exacte reste privée.'}</p>
          </div>

          <div>
            <label htmlFor="message" className={label}>Message <span className="font-normal text-gray-500">(facultatif)</span></label>
            <textarea id="message" rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Longueur, couleur voulue, précisions…"
              className={`${champ} resize-none`} />
          </div>
        </div>
      )}
    </PleinEcran>
  );
}

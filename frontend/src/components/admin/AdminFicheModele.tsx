import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { api, CouleurModele, ConseilEntretien } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import ModeleVisuel from '../client/ModeleVisuel';

// Fiche d'un modèle vue par la cliente : prix de référence, couleurs possibles,
// conseils d'entretien. Saisie par l'admin.

const COULEURS_RAPIDES: CouleurModele[] = [
  { nom: 'Noir', hex: '#1C1917' }, { nom: 'Brun (#4)', hex: '#4A3728' }, { nom: 'Châtain miel', hex: '#8A5A36' },
  { nom: 'Blond cuivré', hex: '#C6925B' }, { nom: 'Bordeaux', hex: '#700A26' }, { nom: 'Nude', hex: '#E6C8BC' },
  { nom: 'Rouge', hex: '#B3122E' }, { nom: 'Blanc', hex: '#F5F2EE' },
];
const CONSEILS_TYPES: Record<string, ConseilEntretien[]> = {
  coiffure: [
    { critere: 'Eau', conseil: 'Laver au shampooing doux et sécher complètement', statut: 'oui' },
    { critere: 'Chaleur', conseil: 'Fer à lisser déconseillé sur les mèches', statut: 'non' },
    { critere: 'Nuit', conseil: 'Dormir avec un bonnet en satin', statut: 'oui' },
  ],
  ongles: [
    { critere: 'Eau', conseil: 'Porter des gants pour la vaisselle', statut: 'prudence' },
    { critere: 'Huile', conseil: 'Hydrater les cuticules chaque soir', statut: 'oui' },
    { critere: 'Outils', conseil: 'Ne pas utiliser les ongles pour ouvrir', statut: 'non' },
  ],
};

export default function AdminFicheModele({ modele, onFermer, onEnregistre }: { modele: any | null; onFermer: () => void; onEnregistre: () => void }) {
  const { showToast } = useAppStore();
  const [prix, setPrix] = useState('');
  const [couleurs, setCouleurs] = useState<CouleurModele[]>([]);
  const [conseils, setConseils] = useState<ConseilEntretien[]>([]);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!modele) return;
    setPrix(modele.prix_reference ? String(modele.prix_reference) : '');
    setCouleurs(modele.couleurs || []);
    setConseils(modele.conseils_entretien || []);
  }, [modele]);

  if (!modele) return null;

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      await api.modeles.admin.fiche(modele.id, {
        prix_reference: prix ? Number(prix.replace(/\D/g, '')) : null,
        couleurs: couleurs.filter((c) => c.nom.trim()),
        conseils_entretien: conseils.filter((c) => c.critere.trim() && c.conseil.trim()),
      });
      showToast('Fiche enregistrée', 'success');
      onEnregistre();
      onFermer();
    } catch (e: any) {
      let msg = 'Enregistrement impossible';
      try { msg = JSON.parse(String(e.message).replace(/^HTTP \d+: /, '')).error || msg; } catch { /* brut */ }
      showToast(msg, 'error');
    } finally {
      setEnvoi(false);
    }
  };

  const champ = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white';
  const majCouleur = (i: number, c: Partial<CouleurModele>) => setCouleurs((l) => l.map((x, j) => (j === i ? { ...x, ...c } : x)));
  const majConseil = (i: number, c: Partial<ConseilEntretien>) => setConseils((l) => l.map((x, j) => (j === i ? { ...x, ...c } : x)));

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center" onClick={onFermer}>
      <div className="w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="w-14 h-[72px] rounded-xl overflow-hidden flex-shrink-0 bg-gray-100"><ModeleVisuel modele={modele} compact className="w-full h-full" /></div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white truncate">{modele.titre}</p>
            <p className="text-sm text-gray-500">{modele.categorie} · ce que la cliente voit sur la fiche</p>
          </div>
          <button onClick={onFermer} aria-label="Fermer" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5" /></button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1.5">Prix de référence (F CFA)</label>
          <input value={prix} onChange={(e) => setPrix(e.target.value.replace(/\D/g, '').slice(0, 7))} inputMode="numeric" placeholder={modele.prix ? `Prix de la pro : ${modele.prix}` : 'ex. 25000'} className={champ} />
          <p className="text-xs text-gray-500 mt-1">Repère pour les clientes qui proposent leur prix. Vide : prix de la pro d’origine ou prix médian des offres.</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1.5">{modele.categorie === 'coiffure' ? 'Couleurs des mèches' : 'Couleurs possibles'}</p>
          <div className="space-y-2">
            {couleurs.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="color" value={c.hex} onChange={(e) => majCouleur(i, { hex: e.target.value.toUpperCase() })} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer flex-shrink-0" />
                <input value={c.nom} maxLength={40} onChange={(e) => majCouleur(i, { nom: e.target.value })} placeholder="Nom de la couleur" className={champ} />
                <button onClick={() => setCouleurs((l) => l.filter((_, j) => j !== i))} aria-label="Retirer" className="p-2 text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          {couleurs.length < 8 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {COULEURS_RAPIDES.filter((r) => !couleurs.some((c) => c.hex.toUpperCase() === r.hex.toUpperCase())).map((r) => (
                <button key={r.hex} onClick={() => setCouleurs((l) => [...l, r])} className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-xs">
                  <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: r.hex }} />{r.nom}
                </button>
              ))}
              <button onClick={() => setCouleurs((l) => [...l, { nom: '', hex: '#8A5A36' }])} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-xs"><Plus className="w-3 h-3" /> Autre</button>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Conseils d’entretien</p>
            {conseils.length === 0 && CONSEILS_TYPES[modele.categorie] && (
              <button onClick={() => setConseils(CONSEILS_TYPES[modele.categorie])} className="text-xs font-semibold text-vin-600">Partir d’un modèle type</button>
            )}
          </div>
          <div className="space-y-2">
            {conseils.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2 p-2 rounded-xl bg-gray-50 dark:bg-gray-900">
                <input value={c.critere} maxLength={40} onChange={(e) => majConseil(i, { critere: e.target.value })} placeholder="Critère (Eau, Lisser…)" className={champ} />
                <select value={c.statut} onChange={(e) => majConseil(i, { statut: e.target.value as ConseilEntretien['statut'] })} className={champ}>
                  <option value="oui">Oui</option><option value="prudence">Prudence</option><option value="non">Non</option>
                </select>
                <input value={c.conseil} maxLength={160} onChange={(e) => majConseil(i, { conseil: e.target.value })} placeholder="Conseil (Sécher complètement après…)" className={champ} />
                <button onClick={() => setConseils((l) => l.filter((_, j) => j !== i))} aria-label="Retirer" className="p-2 text-red-600 justify-self-center"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          {conseils.length < 8 && (
            <button onClick={() => setConseils((l) => [...l, { critere: '', conseil: '', statut: 'oui' }])} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-vin-600"><Plus className="w-4 h-4" /> Ajouter un conseil</button>
          )}
        </div>

        <button onClick={enregistrer} disabled={envoi} className="w-full py-3 rounded-full bg-vin-600 text-white font-semibold disabled:opacity-60">
          {envoi ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Enregistrer la fiche'}
        </button>
      </div>
    </div>
  );
}

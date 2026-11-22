import { Modele, TableauPinterest } from '../models/index.js';
import { normaliser, texteRecherche } from './modeles-sync.js';
import { photoPertinente } from './filtre-photos.js';
import { logger } from '../logger.js';

// Synchronisation automatique : les épingles des tableaux Pinterest suivis
// (admin → Modèles → Tableaux Pinterest) arrivent seules dans le fil Découvrir.
// Source : les données publiques du widget OFFICIEL de tableau Pinterest
// (celles qu'affiche embedBoard). Chaque épingle est ensuite affichée par le
// widget officiel embedPin : aucune image n'est copiée chez nous.

const INTERVALLE_MS = 6 * 3600 * 1000;

function cheminTableau(url: string): string | null {
  try {
    const seg = new URL(url).pathname.split('/').filter(Boolean);
    return seg.length === 2 ? `${encodeURIComponent(seg[0])}/${encodeURIComponent(seg[1])}` : null;
  } catch {
    return null;
  }
}

export async function synchroniserTableau(tableauId: number): Promise<{ importees: number; ignorees: number }> {
  const t: any = await TableauPinterest.findById(tableauId);
  if (!t) throw new Error('Tableau introuvable');
  const chemin = cheminTableau(t.url);
  if (!chemin) throw new Error('URL de tableau invalide');

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    let json: any;
    try {
      const res = await fetch(`https://widgets.pinterest.com/v3/pidgets/boards/${chemin}/pins/`, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (res.status === 404) throw new Error('Tableau introuvable ou privé sur Pinterest');
      if (!res.ok) throw new Error(`Pinterest HTTP ${res.status}`);
      json = await res.json();
    } finally {
      clearTimeout(timer);
    }
    const epingles: any[] = json?.data?.pins || [];
    const ids = epingles.map(p => String(p.id)).filter(id => /^\d{5,25}$/.test(id));
    // Épingles retirées avec un tableau qui n'était plus suivi : elles reviennent (pas celles masquées par l'admin)
    const r = await Modele.updateMany(
      { source_externe_id: { $in: ids.map(id => `pinterest:${id}`) }, retire_avec_tableau: true },
      { is_active: true, retire_avec_tableau: false, tableau_id: t._id, titre: t.titre, categorie: t.categorie, updated_at: new Date() }
    );
    const reactivees = r.modifiedCount || 0;
    const deja = new Set((await Modele.find({ source_externe_id: { $in: ids.map(id => `pinterest:${id}`) } }).distinct('source_externe_id')) as string[]);

    const tags = [...new Set(normaliser(t.titre).split(' ').filter(w => w.length > 2))];
    let importees = reactivees, ignorees = 0;
    for (const p of epingles) {
      const id = String(p.id);
      if (!/^\d{5,25}$/.test(id) || deja.has(`pinterest:${id}`)) continue;
      // Pas de vidéos ; pas d'hommes, d'enfants, d'animaux ni de nudité (description de l'épingle)
      if (p.is_video || !photoPertinente(String(p.description || ''), [])) { ignorees++; continue; }
      try {
        await Modele.create({
          titre: t.titre, categorie: t.categorie, tags, photo_url: '', source: 'pinterest',
          pin_url: `https://www.pinterest.com/pin/${id}/`, tableau_id: t._id,
          credit_nom: 'Pinterest', credit_url: `https://www.pinterest.com/pin/${id}/`, source_externe_id: `pinterest:${id}`,
          recherche: texteRecherche([t.titre, t.categorie, String(p.description || '').slice(0, 300)]),
        });
        importees++;
      } catch (e: any) {
        if (e?.code !== 11000) throw e;
      }
    }
    await TableauPinterest.updateOne({ _id: t._id }, { derniere_synchro: new Date(), derniere_erreur: null, $inc: { nb_importees: importees } });
    if (importees) logger.info(`[pinterest] « ${t.titre} » : ${importees} nouvelle(s) épingle(s)`);
    return { importees, ignorees };
  } catch (e: any) {
    const message = e?.name === 'AbortError' ? 'Pinterest ne répond pas' : e.message;
    await TableauPinterest.updateOne({ _id: t._id }, { derniere_synchro: new Date(), derniere_erreur: message });
    throw new Error(message);
  }
}

export async function synchroniserTousLesTableaux(): Promise<void> {
  const tableaux = await TableauPinterest.find({ is_active: true }).select('_id');
  for (const t of tableaux) {
    try { await synchroniserTableau(t._id as number); } catch (e: any) { logger.error(`[pinterest] tableau ${t._id}: ${e.message}`); }
  }
}

export function startPinterestSyncLoop(): void {
  const run = () => synchroniserTousLesTableaux().catch(e => logger.error(`[pinterest] synchro: ${e.message}`));
  setTimeout(run, 30_000);
  setInterval(run, INTERVALLE_MS);
}

import { User, ModeleSwipe, Modele, Prestataire, Service, Reservation } from '../models/index.js';
import { COMMUNES } from './communes.js';

// Back office : la demande face aux pros, commune par commune.
// Sert à savoir où recruter des pros et où envoyer les visuels WhatsApp.

const JOUR = 24 * 3600 * 1000;
export const PERIODE_CARTE_JOURS = 30;

export type StatutCommune = 'manque_pros' | 'manque_clientes' | 'equilibre' | 'a_lancer';

export interface LigneCommune {
  commune: string; zone: string; lat: number; lng: number;
  clientes: number; clientes_actives: number; likes: number;
  pros: number; pros_actives: number; pros_domicile: number;
  reservations: number; top_categorie: string | null;
  statut: StatutCommune; conseil: string;
}

/** Classe une commune selon l'équilibre clientes actives / pros actives. */
export function statutCommune(clientesActives: number, prosActives: number): StatutCommune {
  if (clientesActives === 0 && prosActives === 0) return 'a_lancer';
  if (prosActives === 0 || clientesActives / prosActives >= 8) return 'manque_pros';
  if (clientesActives < prosActives * 2) return 'manque_clientes';
  return 'equilibre';
}

function conseil(l: Omit<LigneCommune, 'statut' | 'conseil'>, statut: StatutCommune): string {
  const cat = l.top_categorie ? ` (surtout ${l.top_categorie})` : '';
  switch (statut) {
    case 'manque_pros':
      return l.pros_actives === 0
        ? `${l.clientes_actives} cliente(s) active(s)${cat} et aucune pro installée${l.pros_domicile ? ` (${l.pros_domicile} vient à domicile)` : ''} : recrute des pros à ${l.commune} en priorité.`
        : `${l.clientes_actives} clientes pour ${l.pros_actives} pro(s)${cat} : recrute des pros à ${l.commune}.`;
    case 'manque_clientes':
      return `${l.pros_actives} pro(s) attendent des clientes : partage les visuels WhatsApp à ${l.commune}.`;
    case 'equilibre':
      return `Bon équilibre : continue d'animer ${l.commune}.`;
    default:
      return `Pas encore d'activité à ${l.commune}.`;
  }
}

export async function carteDesCommunes() {
  const depuis = new Date(Date.now() - PERIODE_CARTE_JOURS * JOUR);

  const [users, pros, likes] = await Promise.all([
    User.find({ commune: { $ne: null }, role_id: { $ne: 3 } }).select('commune').limit(200000).lean(),
    Prestataire.find({ is_active: { $ne: false } }).select('commune zones_deplacement').lean(),
    ModeleSwipe.find({ action: 'like', created_at: { $gte: depuis } }).select('user_id modele_id').limit(500000).lean(),
  ]);
  const communeDe = new Map<number, string>(users.map((u: any) => [u._id as number, u.commune as string]));

  const [servicesActifs, servicesDomicile, categories, resas] = await Promise.all([
    Service.distinct('prestataire_id', { is_active: true, deleted_at: null }),
    Service.distinct('prestataire_id', { is_active: true, deleted_at: null, is_domicile: true }),
    Modele.find({ _id: { $in: [...new Set(likes.map((l: any) => l.modele_id))] } }).select('categorie').lean(),
    Reservation.find({ created_at: { $gte: depuis }, client_id: { $in: [...communeDe.keys()] } }).select('client_id').lean(),
  ]);
  const actives = new Set(servicesActifs as number[]);
  const domicile = new Set(servicesDomicile as number[]);
  const categorieDe = new Map(categories.map((m: any) => [m._id as number, m.categorie as string]));

  const parCommune = new Map<string, { clientes: number; actives: Set<number>; likes: number; cats: Map<string, number>; pros: number; prosActives: number; prosDomicile: number; resas: number }>();
  const ligne = (c: string) => {
    if (!parCommune.has(c)) parCommune.set(c, { clientes: 0, actives: new Set(), likes: 0, cats: new Map(), pros: 0, prosActives: 0, prosDomicile: 0, resas: 0 });
    return parCommune.get(c)!;
  };
  for (const u of users as any[]) ligne(u.commune).clientes++;
  for (const l of likes as any[]) {
    const c = communeDe.get(l.user_id);
    if (!c) continue;
    const x = ligne(c);
    x.actives.add(l.user_id);
    x.likes++;
    const cat = categorieDe.get(l.modele_id);
    if (cat) x.cats.set(cat, (x.cats.get(cat) || 0) + 1);
  }
  for (const p of pros as any[]) {
    if (p.commune) {
      const x = ligne(p.commune);
      x.pros++;
      if (actives.has(p._id)) x.prosActives++;
    }
    if (domicile.has(p._id)) {
      const zones: string[] = p.zones_deplacement?.length ? p.zones_deplacement : p.commune ? [p.commune] : [];
      for (const z of zones) ligne(z).prosDomicile++;
    }
  }
  for (const r of resas as any[]) {
    const c = communeDe.get(r.client_id);
    if (c) ligne(c).resas++;
  }

  const lignes: LigneCommune[] = COMMUNES.map(c => {
    const x = parCommune.get(c.nom);
    const top = x ? [...x.cats.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null : null;
    const base = {
      commune: c.nom, zone: c.zone, lat: c.lat, lng: c.lng,
      clientes: x?.clientes || 0, clientes_actives: x?.actives.size || 0, likes: x?.likes || 0,
      pros: x?.pros || 0, pros_actives: x?.prosActives || 0, pros_domicile: x?.prosDomicile || 0,
      reservations: x?.resas || 0, top_categorie: top,
    };
    const statut = statutCommune(base.clientes_actives, base.pros_actives);
    return { ...base, statut, conseil: conseil(base, statut) };
  });

  const [usersSansCommune, prosSansCommune] = await Promise.all([
    User.countDocuments({ $or: [{ commune: null }, { commune: { $exists: false } }], role_id: { $ne: 3 } }),
    Prestataire.countDocuments({ $or: [{ commune: null }, { commune: { $exists: false } }], is_active: { $ne: false } }),
  ]);

  return { periode_jours: PERIODE_CARTE_JOURS, communes: lignes, sans_commune: { comptes: usersSansCommune, pros: prosSansCommune } };
}

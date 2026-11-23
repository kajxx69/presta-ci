import { Prestataire, User } from '../models/index.js';
import { communeDepuisTexte } from './communes.js';
import { logger } from '../logger.js';

/** Remplit `commune` pour les pros et comptes existants à partir de leur ville/adresse (idempotent). */
export async function remplirCommunes(): Promise<void> {
  try {
    let n = 0;
    const pros = await Prestataire.find({ $or: [{ commune: null }, { commune: { $exists: false } }] }).select('ville adresse').limit(5000);
    for (const p of pros) {
      const c = communeDepuisTexte(p.ville) || communeDepuisTexte(p.adresse);
      if (c) { await Prestataire.collection.updateOne({ _id: p._id as any }, { $set: { commune: c.nom } }); n++; }
    }
    const users = await User.find({ ville: { $nin: [null, ''] }, $or: [{ commune: null }, { commune: { $exists: false } }] }).select('ville').limit(20000);
    for (const u of users) {
      const c = communeDepuisTexte(u.ville);
      if (c) { await User.collection.updateOne({ _id: u._id as any }, { $set: { commune: c.nom } }); n++; }
    }
    if (n) logger.info(`Communes renseignées pour ${n} profil(s)`);
  } catch (e) {
    logger.warn(`remplirCommunes : échec (sans gravité) — ${(e as Error)?.message || e}`);
  }
}

import mongoose from 'mongoose';

/**
 * Verrou d'un créneau horaire (prestataire + date + heure de début).
 * L'unicité de l'index est la vraie protection anti double-booking : deux
 * requêtes concurrentes qui tentent d'insérer le même triplet, une seule
 * réussira (l'autre lève une erreur E11000), contrairement à une transaction
 * MongoDB classique qui ne bloque pas la création de deux documents distincts
 * en parallèle.
 */
const slotLockSchema = new mongoose.Schema({
  prestataire_id: { type: Number, required: true },
  date_reservation: { type: String, required: true }, // YYYY-MM-DD, pas Date (comparaison exacte)
  heure_debut: { type: String, required: true },
  reservation_id: { type: Number, required: true },
  created_at: { type: Date, default: Date.now, expires: 3600 }, // TTL de sécurité : purge après 1h si jamais orphelin
}, {
  versionKey: false,
});

slotLockSchema.index({ prestataire_id: 1, date_reservation: 1, heure_debut: 1 }, { unique: true });

export const SlotLock = mongoose.model('SlotLock', slotLockSchema);

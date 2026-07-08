import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

// --- StatutReservation ---

const statutReservationSchema = new mongoose.Schema({
  _id: { type: Number },
  nom: { type: String, required: true, unique: true },
  couleur: String,
  description: String
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

statutReservationSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('statuts_reservation');
  }
});

export const StatutReservation = mongoose.model('StatutReservation', statutReservationSchema);

// --- Reservation ---

const reservationSchema = new mongoose.Schema({
  _id: { type: Number },
  client_id: { type: Number, required: true, ref: 'User' },
  prestataire_id: { type: Number, required: true, ref: 'Prestataire' },
  service_id: { type: Number, required: true, ref: 'Service' },
  statut_id: { type: Number, default: 1, ref: 'StatutReservation' },
  booking_type: { type: String, enum: ['appointment', 'order'], default: 'appointment' },
  date_reservation: { type: Date, required: true },
  heure_debut: { type: String },
  heure_fin: { type: String },
  prix_final: { type: Number, required: true },
  prix_total: Number,
  quantite: { type: Number, default: 1 },
  notes_client: String,
  specifications: String,
  notes_prestataire: String,
  publication_id: { type: Number, default: null, ref: 'Publication' },
  a_domicile: { type: Boolean, default: false },
  adresse_rdv: String,
  adresse_rdv_lat: { type: Number, default: null },
  adresse_rdv_lng: { type: Number, default: null },
  rappel_envoye: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

reservationSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('reservations');
  }
  this.updated_at = new Date();
});

reservationSchema.index({ client_id: 1, date_reservation: 1 });
reservationSchema.index({ prestataire_id: 1, date_reservation: 1 });
reservationSchema.index({ statut_id: 1 });

export const Reservation = mongoose.model('Reservation', reservationSchema);

// --- HistoriqueReservation ---

const historiqueReservationSchema = new mongoose.Schema({
  _id: { type: Number },
  reservation_id: { type: Number, required: true, ref: 'Reservation' },
  ancien_statut_id: { type: Number, ref: 'StatutReservation' },
  nouveau_statut_id: { type: Number, required: true, ref: 'StatutReservation' },
  commentaire: String,
  changed_by_user_id: { type: Number, required: true, ref: 'User' },
  changed_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

historiqueReservationSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('historique_reservations');
  }
});

export const HistoriqueReservation = mongoose.model('HistoriqueReservation', historiqueReservationSchema);

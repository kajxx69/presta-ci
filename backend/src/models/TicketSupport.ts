import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

const ticketSupportSchema = new mongoose.Schema({
  _id: { type: Number },
  user_id: { type: Number, required: true, ref: 'User' },
  // linked reservation if applicable
  reservation_id: { type: Number, default: null, ref: 'Reservation' },
  sujet: { type: String, required: true },
  categorie: {
    type: String,
    enum: ['probleme_reservation', 'probleme_paiement', 'probleme_prestataire', 'probleme_client', 'probleme_compte', 'autre'],
    default: 'autre'
  },
  statut: {
    type: String,
    enum: ['ouvert', 'en_cours', 'resolu', 'ferme'],
    default: 'ouvert'
  },
  priorite: {
    type: String,
    enum: ['faible', 'normale', 'haute', 'urgente'],
    default: 'normale'
  },
  admin_id: { type: Number, default: null, ref: 'User' },
  resolved_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

ticketSupportSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('tickets_support');
  }
  this.updated_at = new Date();
});

ticketSupportSchema.index({ user_id: 1, statut: 1 });
ticketSupportSchema.index({ statut: 1, created_at: -1 });
ticketSupportSchema.index({ admin_id: 1 });

export const TicketSupport = mongoose.model('TicketSupport', ticketSupportSchema);

// Messages du ticket (fil de discussion)
const messageTicketSchema = new mongoose.Schema({
  _id: { type: Number },
  ticket_id: { type: Number, required: true, ref: 'TicketSupport' },
  auteur_id: { type: Number, required: true, ref: 'User' },
  contenu: { type: String, required: true },
  is_admin: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

messageTicketSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('messages_tickets');
  }
});

messageTicketSchema.index({ ticket_id: 1, created_at: 1 });

export const MessageTicket = mongoose.model('MessageTicket', messageTicketSchema);

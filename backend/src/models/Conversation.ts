import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

// --- Conversation client ↔ prestataire ---

const conversationSchema = new mongoose.Schema({
  _id: { type: Number },
  client_id: { type: Number, required: true, ref: 'User' },
  prestataire_id: { type: Number, required: true, ref: 'Prestataire' },
  dernier_message: { type: String, default: null },
  dernier_message_at: { type: Date, default: null },
  non_lus_client: { type: Number, default: 0 },
  non_lus_prestataire: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

conversationSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('conversations');
  }
  this.updated_at = new Date();
});

conversationSchema.index({ client_id: 1, prestataire_id: 1 }, { unique: true });
conversationSchema.index({ client_id: 1, dernier_message_at: -1 });
conversationSchema.index({ prestataire_id: 1, dernier_message_at: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);

// --- Message ---

const messageSchema = new mongoose.Schema({
  _id: { type: Number },
  conversation_id: { type: Number, required: true, ref: 'Conversation' },
  sender_user_id: { type: Number, required: true, ref: 'User' },
  contenu: { type: String, default: '', maxlength: 2000 },
  type: { type: String, enum: ['text', 'devis', 'image'], default: 'text' },
  // Pour type 'devis' : { service_id, montant, date, heure?, description?, statut: propose|accepte|refuse, reservation_id? }
  devis: { type: mongoose.Schema.Types.Mixed, default: null },
  // Pour type 'image' : URL /uploads (contenu = légende optionnelle)
  image: { type: String, default: null },
  deleted: { type: Boolean, default: false },
  lu: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

messageSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('messages');
  }
});

messageSchema.index({ conversation_id: 1, created_at: 1 });

export const Message = mongoose.model('Message', messageSchema);

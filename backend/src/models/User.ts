import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

const userSchema = new mongoose.Schema({
  _id: { type: Number },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role_id: { type: Number, required: true, ref: 'Role' },
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  telephone: String,
  ville: String,
  photo_profil: String,
  is_active: { type: Boolean, default: true },
  // Suppression douce par l'admin : le compte disparaît des listes et son email
  // est libéré (anonymisé), mais le document reste pour l'intégrité référentielle
  // (réservations, avis, conversations pointent vers ce user_id)
  deleted_at: { type: Date, default: null },
  note_moyenne_client: { type: Number, default: null },
  nombre_avis_client: { type: Number, default: 0 },
  email_verified: { type: Boolean, default: false },
  email_verification_token: String,
  reset_password_token: String,
  reset_password_expires: Date,
  code_parrainage: { type: String, unique: true, sparse: true },
  parrain_id: { type: Number, default: null, ref: 'User' },
  last_login: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('users');
  }
  this.updated_at = new Date();
});

export const User = mongoose.model('User', userSchema);

// --- UserSession ---

const userSessionSchema = new mongoose.Schema({
  _id: { type: Number },
  user_id: { type: Number, required: true, ref: 'User' },
  token: { type: String, required: true, unique: true },
  device_info: String,
  ip_address: String,
  expires_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSessionSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('user_sessions');
  }
});

export const UserSession = mongoose.model('UserSession', userSessionSchema);

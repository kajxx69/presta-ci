import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

// --- Configuration (app_settings / configurations) ---

const configurationSchema = new mongoose.Schema({
  _id: { type: Number },
  cle: { type: String, required: true, unique: true },
  valeur: String,
  type: { type: String, enum: ['string', 'integer', 'float', 'boolean', 'json'], default: 'string' },
  description: String,
  updated_by_admin_id: { type: Number, ref: 'User' },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

configurationSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('configurations');
  }
  this.updated_at = new Date();
});

export const Configuration = mongoose.model('Configuration', configurationSchema);

// --- SystemLog ---

const systemLogSchema = new mongoose.Schema({
  _id: { type: Number },
  level: { type: String, enum: ['debug', 'info', 'warning', 'error', 'critical'], default: 'info' },
  message: { type: String, required: true },
  context: { type: mongoose.Schema.Types.Mixed, default: null },
  user_id: { type: Number, ref: 'User' },
  ip_address: String,
  user_agent: String,
  created_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

systemLogSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('system_logs');
  }
});

systemLogSchema.index({ level: 1, created_at: 1 });
systemLogSchema.index({ user_id: 1, created_at: 1 });

export const SystemLog = mongoose.model('SystemLog', systemLogSchema);

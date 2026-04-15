import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

// --- PushToken ---

const pushTokenSchema = new mongoose.Schema({
  _id: { type: Number },
  user_id: { type: Number, required: true, ref: 'User' },
  token: { type: String, required: true },
  device_type: { type: String, enum: ['android', 'ios', 'web'], required: true },
  device_id: String,
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

pushTokenSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('push_tokens');
  }
  this.updated_at = new Date();
});

pushTokenSchema.index({ user_id: 1, token: 1 }, { unique: true });

export const PushToken = mongoose.model('PushToken', pushTokenSchema);

// --- NotificationTemplate ---

const notificationTemplateSchema = new mongoose.Schema({
  _id: { type: Number },
  nom: { type: String, required: true, unique: true },
  titre: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' },
  variables: { type: mongoose.Schema.Types.Mixed, default: null },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

notificationTemplateSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('notification_templates');
  }
});

export const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);

// --- Notification ---

const notificationSchema = new mongoose.Schema({
  _id: { type: Number },
  user_id: { type: Number, required: true, ref: 'User' },
  template_id: { type: Number, ref: 'NotificationTemplate' },
  titre: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error', 'reservation', 'publication', 'abonnement'], default: 'info' },
  is_read: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed, default: null },
  sent_at: { type: Date, default: Date.now },
  read_at: Date
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

notificationSchema.index({ user_id: 1, is_read: 1 });
notificationSchema.index({ sent_at: -1 });

notificationSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('notifications');
  }
});

export const Notification = mongoose.model('Notification', notificationSchema);

// --- NotificationPreference ---

const notificationPreferenceSchema = new mongoose.Schema({
  _id: { type: Number },
  user_id: { type: Number, required: true, unique: true, ref: 'User' },
  // Canaux
  push_notifications: { type: Boolean, default: true },
  email_notifications: { type: Boolean, default: true },
  sms_notifications: { type: Boolean, default: false },
  // Réservations
  new_reservation: { type: Boolean, default: true },
  reservation_confirmed: { type: Boolean, default: true },
  reservation_cancelled: { type: Boolean, default: true },
  reservation_updates: { type: Boolean, default: true },
  // Activité sociale
  new_publication: { type: Boolean, default: false },
  new_like: { type: Boolean, default: false },
  new_comment: { type: Boolean, default: false },
  new_follower: { type: Boolean, default: false },
  // Autres
  promotions: { type: Boolean, default: true },
  tips: { type: Boolean, default: true },
  newsletter: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

notificationPreferenceSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('notification_preferences');
  }
  this.updated_at = new Date();
});

export const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);

import mongoose from 'mongoose';
import { getNextId } from './Counter.js';

const roleSchema = new mongoose.Schema({
  _id: { type: Number },
  nom: { type: String, required: true, unique: true },
  description: String,
  created_at: { type: Date, default: Date.now }
}, {
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

roleSchema.pre('save', async function () {
  if (this.isNew && !this._id) {
    this._id = await getNextId('roles');
  }
});

export const Role = mongoose.model('Role', roleSchema);

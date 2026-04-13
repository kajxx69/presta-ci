import mongoose from 'mongoose';

// Fix: Mongoose's default `id` virtual calls `_id.toString()`, returning a string.
// Since all our models use numeric _id, we need `id` to also be numeric
// so frontend === comparisons work correctly.
mongoose.plugin((schema) => {
  const existing = schema.get('toJSON') || {};
  schema.set('toJSON', {
    ...existing,
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      if (typeof ret._id === 'number') {
        ret.id = ret._id;
      }
      return ret;
    }
  });
});

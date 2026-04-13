import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

export const Counter = mongoose.model('Counter', counterSchema);

export async function getNextId(modelName: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    modelName,
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return counter!.seq;
}

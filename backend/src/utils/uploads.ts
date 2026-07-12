import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { logger } from '../logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Base publique du backend, utilisée pour construire les URLs des fichiers.
// Vide par défaut (URL relative /uploads/...) pour que ça marche derrière n'importe
// quelle origine (local, tunnel Cloudflare, prod) via le proxy /uploads du frontend.
// Définir PUBLIC_BASE_URL en dur uniquement si le backend est appelé hors proxy.
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

async function ensureDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

function isDataUri(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:');
}

/**
 * Les fichiers sont stockés dans MongoDB (GridFS) et non sur le disque :
 * le filesystem de Render (plan gratuit) est éphémère — chaque redéploiement
 * ou mise en veille efface tout. Le disque ne sert plus que de fallback en
 * lecture pour les anciens fichiers locaux.
 */
let bucket: GridFSBucket | null = null;
export function getUploadsBucket(): GridFSBucket {
  if (!bucket) {
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB non connecté');
    bucket = new GridFSBucket(db as any, { bucketName: 'uploads' });
  }
  return bucket;
}

/**
 * Écrit un data-URI base64 sur disque et retourne son URL publique (/uploads/xxx.ext).
 * Rejette les types non autorisés et les fichiers > 2MB.
 */
export async function saveDataUri(dataUri: string): Promise<string> {
  const match = dataUri.match(/^data:([a-z]+\/[a-z0-9.+-]+);base64,(.+)$/is);
  if (!match) throw new Error('Format de fichier invalide (data-URI base64 attendu)');

  const mime = match[1].toLowerCase();
  const ext = MIME_EXTENSIONS[mime];
  if (!ext) throw new Error(`Type de fichier non autorisé: ${mime}`);

  const buffer = Buffer.from(match[2], 'base64');
  const maxSize = mime.startsWith('video/') ? 20 * 1024 * 1024 : MAX_IMAGE_SIZE;
  if (buffer.length > maxSize) {
    throw new Error(`Fichier trop volumineux (max ${Math.round(maxSize / 1024 / 1024)}MB). Compressez votre ${mime.startsWith('video/') ? 'vidéo' : 'image'}.`);
  }

  const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  await new Promise<void>((resolve, reject) => {
    const up = getUploadsBucket().openUploadStream(name, { metadata: { contentType: mime } });
    up.on('finish', () => resolve());
    up.on('error', reject);
    up.end(buffer);
  });
  return `${PUBLIC_BASE_URL}/uploads/${name}`;
}

/**
 * Convertit récursivement les data-URIs base64 d'une valeur (string, tableau) en fichiers,
 * en remplaçant chaque data-URI par son URL /uploads/…
 * Les valeurs déjà en URL (ou null) sont laissées telles quelles.
 */
export async function materializePhotos<T>(input: T): Promise<T> {
  if (input == null) return input;

  if (isDataUri(input)) {
    return (await saveDataUri(input)) as unknown as T;
  }

  if (Array.isArray(input)) {
    const out = await Promise.all(input.map(item => materializePhotos(item)));
    return out as unknown as T;
  }

  // Chaîne JSON encodant un tableau de photos (certains clients envoient ce format)
  if (typeof input === 'string' && input.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return (await materializePhotos(parsed)) as unknown as T;
    } catch { /* pas du JSON, laisser tel quel */ }
  }

  return input;
}

/** Supprime un fichier /uploads/… (best-effort, pour les remplacements) */
export async function deleteUpload(publicUrl: string): Promise<void> {
  if (!publicUrl.includes('/uploads/')) return;
  const name = path.basename(publicUrl);
  try {
    const files = await getUploadsBucket().find({ filename: name }).toArray();
    for (const f of files) await getUploadsBucket().delete(f._id);
  } catch (e: any) {
    logger.warn(`[uploads] Suppression GridFS impossible: ${name} (${e.message})`);
  }
  try {
    await fs.unlink(path.join(UPLOADS_DIR, name));
  } catch (e: any) {
    if (e.code !== 'ENOENT') logger.warn(`[uploads] Suppression impossible: ${name} (${e.message})`);
  }
}

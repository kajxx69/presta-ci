import { Response } from 'express';
import { logger } from '../logger.js';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Réponse 500 sans fuite d'informations internes en production.
 * Le détail est toujours loggé côté serveur.
 */
export function serverError(res: Response, e: unknown, context?: string) {
  const message = e instanceof Error ? e.message : String(e);
  logger.error(`${context ? `[${context}] ` : ''}${message}`);
  return res.status(500).json({
    error: IS_PROD ? 'Erreur interne du serveur' : message,
  });
}

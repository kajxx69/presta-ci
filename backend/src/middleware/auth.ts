import { Request, Response, NextFunction } from 'express';
import { User, UserSession, Prestataire, Role } from '../models/index.js';
import { verifyToken, extractTokenFromHeader, JwtPayload } from '../utils/jwt.js';
import { serverError } from '../utils/http.js';

export interface AuthenticatedRequest extends Request {
  userId?: number;
  user?: any;
  jwtPayload?: JwtPayload;
}

export async function getUserIdFromSession(req: Request): Promise<number | null> {
  // Essayer d'abord JWT
  const jwtUserId = await getUserIdFromJWT(req);
  if (jwtUserId) return jwtUserId;

  // Fallback vers les cookies pour la compatibilité
  const token = req.cookies?.session_token as string | undefined;
  if (!token) return null;

  try {
    const session = await UserSession.findOne({
      token,
      expires_at: { $gt: new Date() }
    });
    return session?.user_id || null;
  } catch {
    return null;
  }
}

export async function getUserIdFromJWT(req: Request): Promise<number | null> {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) return null;

    const payload = verifyToken(token);
    return payload.userId;
  } catch {
    return null;
  }
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = await getUserIdFromSession(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const user = await User.findById(userId).select('email nom prenom telephone ville photo_profil role_id is_active');
    if (!user || user.is_active === false) {
      return res.status(403).json({ error: 'Ce compte a été suspendu.' });
    }
    req.userId = userId;
    req.user = user.toJSON();
    next();
  } catch (e: any) {
    serverError(res, e);
  }
}

export async function requirePrestataire(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await requireAuth(req, res, () => {});
    if (!req.userId) return;

    const prestataire = await Prestataire.findOne({ user_id: req.userId });
    if (!prestataire) {
      return res.status(403).json({ error: 'Profil prestataire requis' });
    }

    req.prestataireId = prestataire._id as number;
    next();
  } catch (e: any) {
    serverError(res, e);
  }
}

export function requireRole(roleName: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const role = await Role.findById(req.user.role_id);
      if (!role || role.nom !== roleName) {
        return res.status(403).json({
          error: `Accès refusé. Rôle ${roleName} requis.`
        });
      }

      next();
    } catch (e: any) {
      serverError(res, e);
    }
  };
}

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      user?: any;
      prestataireId?: number;
    }
  }
}

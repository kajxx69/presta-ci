import { Request, Response, NextFunction } from 'express';
import { 
  RegisterRequest, 
  LoginRequest, 
  UpdateUserRequest, 
  CreateServiceRequest, 
  CreatePublicationRequest 
} from '../types/index.js';

// Validation helpers
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,15}$/;
  return phoneRegex.test(phone);
};

// Validation middleware functions
export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  const { email, password, nom, prenom, role_id }: RegisterRequest = req.body;

  if (!email || !password || !nom || !prenom) {
    return res.status(400).json({ error: 'Champs requis manquants: email, password, nom, prenom' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Format d\'email invalide' });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  if (nom.length < 2 || prenom.length < 2) {
    return res.status(400).json({ error: 'Le nom et prénom doivent contenir au moins 2 caractères' });
  }

  if (role_id && ![1, 2].includes(role_id)) {
    return res.status(400).json({ error: 'Role invalide (1=client, 2=prestataire)' });
  }

  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { email, password }: LoginRequest = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Format d\'email invalide' });
  }

  next();
};

export const validateUpdateUser = (req: Request, res: Response, next: NextFunction) => {
  const { nom, prenom, telephone }: UpdateUserRequest = req.body;

  if (nom && nom.length < 2) {
    return res.status(400).json({ error: 'Le nom doit contenir au moins 2 caractères' });
  }

  if (prenom && prenom.length < 2) {
    return res.status(400).json({ error: 'Le prénom doit contenir au moins 2 caractères' });
  }

  if (telephone && !isValidPhone(telephone)) {
    return res.status(400).json({ error: 'Format de téléphone invalide' });
  }

  next();
};

export const validateCreateService = (req: Request, res: Response, next: NextFunction) => {
  const { sous_categorie_id, nom, prix, duree_minutes }: CreateServiceRequest = req.body;

  if (!sous_categorie_id || !nom || prix === undefined || !duree_minutes) {
    return res.status(400).json({ error: 'Champs requis: sous_categorie_id, nom, prix, duree_minutes' });
  }

  if (typeof sous_categorie_id !== 'number' || sous_categorie_id <= 0) {
    return res.status(400).json({ error: 'sous_categorie_id doit être un nombre positif' });
  }

  if (nom.length < 3) {
    return res.status(400).json({ error: 'Le nom du service doit contenir au moins 3 caractères' });
  }

  if (typeof prix !== 'number' || prix < 0) {
    return res.status(400).json({ error: 'Le prix doit être un nombre positif' });
  }

  if (typeof duree_minutes !== 'number' || duree_minutes <= 0) {
    return res.status(400).json({ error: 'La durée doit être un nombre positif en minutes' });
  }

  next();
};

export const validateCreatePublication = (req: Request, res: Response, next: NextFunction) => {
  const { prestataire_id, description }: CreatePublicationRequest = req.body;

  if (!prestataire_id || !description) {
    return res.status(400).json({ error: 'prestataire_id et description requis' });
  }

  if (typeof prestataire_id !== 'number' || prestataire_id <= 0) {
    return res.status(400).json({ error: 'prestataire_id doit être un nombre positif' });
  }

  if (description.length < 10) {
    return res.status(400).json({ error: 'La description doit contenir au moins 10 caractères' });
  }

  if (description.length > 1000) {
    return res.status(400).json({ error: 'La description ne peut pas dépasser 1000 caractères' });
  }

  next();
};

// Sanitization helpers
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '');
};

export const sanitizeObject = (obj: any): any => {
  const sanitized: any = {};
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeString(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }
  return sanitized;
};

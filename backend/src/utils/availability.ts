import type { ClientSession } from 'mongoose';
import { Reservation, StatutReservation } from '../models/index.js';

/** Statuts qui occupent un créneau (tout sauf annulée/refusée/terminée) */
const BLOCKING_STATUTS = ['en_attente', 'confirmee', 'acceptee', 'en_attente_confirmation'];

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export interface HoraireJour { debut: string; fin: string }
export type HorairesOuverture = Record<string, HoraireJour | null>;

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Deux intervalles [aStart, aEnd) et [bStart, bEnd) se chevauchent-ils ? */
export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export interface OccupiedRange { start: number; end: number }

/**
 * Génère les créneaux d'une journée (fonction pure, testable sans base de données).
 */
export function buildDaySlots(
  jour: HoraireJour,
  dureeMinutes: number,
  occupied: OccupiedRange[],
  options?: { nowMinutes?: number; stepMinutes?: number }
): Slot[] {
  const open = toMinutes(jour.debut);
  const close = toMinutes(jour.fin);
  const duree = Math.max(15, dureeMinutes || 30);
  const step = options?.stepMinutes || Math.min(duree, 60);
  const nowMinutes = options?.nowMinutes;

  const slots: Slot[] = [];
  for (let start = open; start + duree <= close; start += step) {
    const end = start + duree;
    const past = nowMinutes !== undefined && start <= nowMinutes;
    const conflict = occupied.some(o => rangesOverlap(start, end, o.start, o.end));
    slots.push({
      heure_debut: toTimeString(start),
      heure_fin: toTimeString(end),
      disponible: !past && !conflict,
    });
  }
  return slots;
}

export async function getBlockingStatutIds(): Promise<number[]> {
  const statuts = await StatutReservation.find({ nom: { $in: BLOCKING_STATUTS } });
  return statuts.map(s => s._id as number);
}

/** Réservations "rendez-vous" qui occupent des créneaux pour un prestataire à une date donnée */
export async function getBlockingReservations(prestataireId: number, date: Date, session?: ClientSession) {
  const statutIds = await getBlockingStatutIds();
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
  return Reservation.find({
    prestataire_id: prestataireId,
    booking_type: 'appointment',
    statut_id: { $in: statutIds },
    date_reservation: { $gte: dayStart, $lte: dayEnd },
    heure_debut: { $ne: null },
  }).select('heure_debut heure_fin _id').session(session ?? null);
}

/** Vérifie si [debut, fin) chevauche une réservation existante du prestataire ce jour-là.
 *  Passer la session de la transaction en cours évite une lecture non isolée pendant
 *  la fenêtre vérification→création (protection anti double-booking). */
export async function hasSlotConflict(
  prestataireId: number,
  date: Date,
  heureDebut: string,
  heureFin: string,
  excludeReservationId?: number,
  session?: ClientSession
): Promise<boolean> {
  const reservations = await getBlockingReservations(prestataireId, date, session);
  const start = toMinutes(heureDebut);
  const end = toMinutes(heureFin);
  return reservations.some(r => {
    if (excludeReservationId && r._id === excludeReservationId) return false;
    if (!r.heure_debut) return false;
    const rStart = toMinutes(r.heure_debut);
    const rEnd = r.heure_fin ? toMinutes(r.heure_fin) : rStart + 30;
    return rangesOverlap(start, end, rStart, rEnd);
  });
}

/** Horaires d'ouverture du prestataire pour une date donnée, ou null si fermé/non défini */
export function getHorairesForDate(horaires: HorairesOuverture | null | undefined, date: Date): HoraireJour | null {
  if (!horaires || typeof horaires !== 'object') return null;
  const jour = JOURS[date.getDay()];
  const h = horaires[jour];
  if (!h || !h.debut || !h.fin) return null;
  return h;
}

export interface Slot { heure_debut: string; heure_fin: string; disponible: boolean }

/**
 * Calcule les créneaux d'une journée à partir des horaires d'ouverture,
 * de la durée du service et des réservations existantes.
 * Retourne [] si le prestataire est fermé ce jour-là.
 */
export async function computeDaySlots(
  prestataireId: number,
  horaires: HorairesOuverture | null | undefined,
  dureeMinutes: number,
  date: Date,
  stepMinutes?: number
): Promise<Slot[]> {
  const jour = getHorairesForDate(horaires, date);
  if (!jour) return [];

  const reservations = await getBlockingReservations(prestataireId, date);
  const occupied: OccupiedRange[] = reservations.map(r => ({
    start: toMinutes(r.heure_debut!),
    end: r.heure_fin ? toMinutes(r.heure_fin) : toMinutes(r.heure_debut!) + 30,
  }));

  // Ne pas proposer de créneaux passés si la date est aujourd'hui
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  return buildDaySlots(jour, dureeMinutes, occupied, {
    nowMinutes: isToday ? now.getHours() * 60 + now.getMinutes() : undefined,
    stepMinutes,
  });
}

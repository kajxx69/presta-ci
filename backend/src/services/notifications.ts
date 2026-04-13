import { PushToken } from '../models/index.js';

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
}

export async function getUserPushTokens(userId: number) {
  try {
    return await PushToken.find({ user_id: userId, is_active: true });
  } catch {
    return [];
  }
}

export async function getPrestatairePushTokens() {
  try {
    const { User } = await import('../models/index.js');
    const prestataires = await User.find({ role_id: 2 }).select('_id');
    const ids = prestataires.map(u => u._id);
    return await PushToken.find({ user_id: { $in: ids }, is_active: true });
  } catch {
    return [];
  }
}

export async function sendNotificationToUser(userId: number, notification: NotificationData): Promise<boolean> {
  try {
    const tokens = await getUserPushTokens(userId);
    if (tokens.length === 0) return false;
    console.log(`📱 Notification à ${tokens.length} appareil(s) pour user ${userId}:`, notification.title);
    // TODO: intégrer Firebase/OneSignal ici
    return true;
  } catch {
    return false;
  }
}

export async function sendNotificationToAllPrestataires(notification: NotificationData): Promise<number> {
  try {
    const tokens = await getPrestatairePushTokens();
    if (tokens.length === 0) return 0;
    console.log(`📱 Broadcast à ${tokens.length} prestataire(s):`, notification.title);
    return tokens.length;
  } catch {
    return 0;
  }
}

export class PrestataireNotifications {
  static async nouvelleReservation(prestataireId: number, clientNom: string, serviceName: string) {
    await sendNotificationToUser(prestataireId, {
      title: '🎉 Nouvelle réservation !',
      body: `${clientNom} a réservé votre service "${serviceName}"`,
      data: { type: 'nouvelle_reservation', prestataire_id: prestataireId },
      badge: 1
    });
  }

  static async reservationAnnulee(prestataireId: number, clientNom: string, serviceName: string) {
    await sendNotificationToUser(prestataireId, {
      title: '❌ Réservation annulée',
      body: `${clientNom} a annulé sa réservation pour "${serviceName}"`,
      data: { type: 'reservation_annulee', prestataire_id: prestataireId }
    });
  }

  static async nouveauAvis(prestataireId: number, note: number, commentaire?: string) {
    const etoiles = '⭐'.repeat(note);
    await sendNotificationToUser(prestataireId, {
      title: '🌟 Nouvel avis reçu !',
      body: `${etoiles} ${commentaire ? commentaire.substring(0, 50) + '...' : `Note: ${note}/5`}`,
      data: { type: 'nouvel_avis', prestataire_id: prestataireId, note },
      badge: 1
    });
  }

  static async abonnementExpire(prestataireId: number, joursRestants: number) {
    await sendNotificationToUser(prestataireId, {
      title: '⚠️ Abonnement bientôt expiré',
      body: `Votre abonnement expire dans ${joursRestants} jour(s). Renouvelez maintenant !`,
      data: { type: 'abonnement_expire', prestataire_id: prestataireId, jours_restants: joursRestants }
    });
  }
}

export class ClientNotifications {
  static async reservationConfirmee(clientId: number, prestataireNom: string, serviceName: string, dateReservation: string) {
    await sendNotificationToUser(clientId, {
      title: '✅ Réservation confirmée !',
      body: `${prestataireNom} a confirmé votre réservation pour "${serviceName}" le ${dateReservation}`,
      data: { type: 'reservation_confirmee', client_id: clientId },
      badge: 1
    });
  }

  static async reservationRefusee(clientId: number, prestataireNom: string, serviceName: string, motif?: string) {
    await sendNotificationToUser(clientId, {
      title: '❌ Réservation refusée',
      body: `${prestataireNom} a refusé votre réservation pour "${serviceName}"${motif ? `: ${motif}` : ''}`,
      data: { type: 'reservation_refusee', client_id: clientId }
    });
  }

  static async serviceTermine(clientId: number, prestataireNom: string, serviceName: string) {
    await sendNotificationToUser(clientId, {
      title: '🎉 Service terminé !',
      body: `Votre service "${serviceName}" avec ${prestataireNom} est terminé. N'oubliez pas de laisser un avis !`,
      data: { type: 'service_termine', client_id: clientId },
      badge: 1
    });
  }

  static async rappelRendezVous(clientId: number, prestataireNom: string, serviceName: string, heureRendezVous: string) {
    await sendNotificationToUser(clientId, {
      title: '⏰ Rappel de rendez-vous',
      body: `Votre rendez-vous avec ${prestataireNom} pour "${serviceName}" est dans 1 heure (${heureRendezVous})`,
      data: { type: 'rappel_rdv', client_id: clientId }
    });
  }
}

export default { sendNotificationToUser, sendNotificationToAllPrestataires, getUserPushTokens, getPrestatairePushTokens, PrestataireNotifications, ClientNotifications };

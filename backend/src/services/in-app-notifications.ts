import { Notification, NotificationTemplate } from '../models/index.js';

export class InAppNotificationService {
  static replaceVariables(message: string, variables: Record<string, any>): string {
    let result = message;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value || ''));
    });
    return result;
  }

  static async getTemplate(templateName: string) {
    try {
      return await NotificationTemplate.findOne({ nom: templateName, is_active: true });
    } catch {
      return null;
    }
  }

  static async createFromTemplate(
    userId: number,
    templateName: string,
    variables: Record<string, any> = {},
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): Promise<number | null> {
    try {
      const template = await this.getTemplate(templateName);
      if (!template) return null;

      const titre = this.replaceVariables(template.titre, variables);
      const message = this.replaceVariables(template.message, variables);

      const notif = await Notification.create({
        user_id: userId,
        template_id: template._id,
        titre, message, type,
        data: variables
      });

      return notif._id as number;
    } catch {
      return null;
    }
  }

  static async createCustom(
    userId: number,
    titre: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    data: any = null
  ): Promise<number | null> {
    try {
      const notif = await Notification.create({ user_id: userId, titre, message, type, data });
      return notif._id as number;
    } catch {
      return null;
    }
  }

  static async getUserNotifications(userId: number, limit = 20, onlyUnread = false) {
    try {
      const filter: any = { user_id: userId };
      if (onlyUnread) filter.is_read = false;
      return await Notification.find(filter).sort({ sent_at: -1 }).limit(limit);
    } catch {
      return [];
    }
  }

  static async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    try {
      const result = await Notification.updateOne(
        { _id: notificationId, user_id: userId },
        { is_read: true, read_at: new Date() }
      );
      return result.modifiedCount > 0;
    } catch {
      return false;
    }
  }

  static async markAllAsRead(userId: number): Promise<number> {
    try {
      const result = await Notification.updateMany(
        { user_id: userId, is_read: false },
        { is_read: true, read_at: new Date() }
      );
      return result.modifiedCount;
    } catch {
      return 0;
    }
  }

  static async deleteNotification(notificationId: number, userId: number): Promise<boolean> {
    try {
      const result = await Notification.deleteOne({ _id: notificationId, user_id: userId });
      return result.deletedCount > 0;
    } catch {
      return false;
    }
  }

  static async getUnreadCount(userId: number): Promise<number> {
    try {
      return await Notification.countDocuments({ user_id: userId, is_read: false });
    } catch {
      return 0;
    }
  }

  static async cleanupOldNotifications(daysOld = 30): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - daysOld * 86400000);
      const result = await Notification.deleteMany({ sent_at: { $lt: cutoff } });
      return result.deletedCount;
    } catch {
      return 0;
    }
  }
}

export class PrestataireInAppNotifications {
  static async nouvelleReservation(prestataireId: number, clientNom: string, serviceName: string, date: string, heure: string) {
    await InAppNotificationService.createFromTemplate(prestataireId, 'nouvelle_reservation', { client_nom: clientNom, service_nom: serviceName, date, heure }, 'info');
  }

  static async reservationAnnulee(prestataireId: number, clientNom: string, serviceName: string) {
    await InAppNotificationService.createCustom(prestataireId, '❌ Réservation annulée', `${clientNom} a annulé sa réservation pour "${serviceName}"`, 'warning');
  }

  static async nouveauAvis(prestataireId: number, note: number, commentaire?: string) {
    const etoiles = '⭐'.repeat(note);
    await InAppNotificationService.createCustom(prestataireId, '🌟 Nouvel avis reçu !', `${etoiles} ${commentaire ? commentaire.substring(0, 100) : `Note: ${note}/5`}`, 'success');
  }

  static async abonnementExpire(prestataireId: number, joursRestants: number) {
    await InAppNotificationService.createCustom(prestataireId, '⚠️ Abonnement bientôt expiré', `Votre abonnement expire dans ${joursRestants} jour(s). Renouvelez maintenant !`, 'warning');
  }

  static async paiementValide(prestataireId: number, planNom: string, duree: string) {
    await InAppNotificationService.createFromTemplate(prestataireId, 'paiement_valide', { plan_nom: planNom, duree }, 'success');
  }
}

export class ClientInAppNotifications {
  static async reservationConfirmee(clientId: number, prestataireNom: string, serviceName: string, date: string, heure: string) {
    await InAppNotificationService.createFromTemplate(clientId, 'reservation_confirmee', { service_nom: serviceName, date, heure, prestataire_nom: prestataireNom }, 'success');
  }

  static async reservationRefusee(clientId: number, prestataireNom: string, serviceName: string, motif?: string) {
    await InAppNotificationService.createFromTemplate(clientId, 'reservation_refusee', { prestataire_nom: prestataireNom, service_nom: serviceName, motif: motif || 'Aucun motif spécifié' }, 'error');
  }

  static async serviceTermine(clientId: number, prestataireNom: string, serviceName: string) {
    await InAppNotificationService.createCustom(clientId, '🎉 Service terminé !', `Votre service "${serviceName}" avec ${prestataireNom} est terminé. N'oubliez pas de laisser un avis !`, 'success');
  }

  static async rappelRendezVous(clientId: number, prestataireNom: string, serviceName: string, heure: string) {
    await InAppNotificationService.createFromTemplate(clientId, 'rappel_rdv', { heure, prestataire_nom: prestataireNom, service_nom: serviceName }, 'info');
  }
}

export default { InAppNotificationService, PrestataireInAppNotifications, ClientInAppNotifications };

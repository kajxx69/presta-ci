import { api } from '../lib/api';

export interface PushNotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private registration: ServiceWorkerRegistration | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Vérifier si les notifications sont supportées
   */
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Obtenir le statut des permissions
   */
  getPermissionStatus(): PushNotificationPermission {
    if (!this.isSupported()) {
      return { granted: false, denied: true, default: false };
    }

    const permission = Notification.permission;
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default'
    };
  }

  /**
   * Demander la permission pour les notifications
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Les notifications ne sont pas supportées sur ce navigateur');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      return false;
    }
  }

  /**
   * Enregistrer le service worker pour les notifications
   */
  async registerServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker non supporté');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker enregistré:', this.registration);
      return true;
    } catch (error) {
      console.error('Erreur enregistrement Service Worker:', error);
      return false;
    }
  }

  /**
   * Obtenir le token de notification push (simulation pour le web)
   */
  async getPushToken(): Promise<string | null> {
    // Pour le web, on génère un token simulé
    // Dans une vraie app, vous utiliseriez Firebase Cloud Messaging
    const deviceId = this.getDeviceId();
    return `web-token-${deviceId}-${Date.now()}`;
  }

  /**
   * Enregistrer le token push sur le serveur
   */
  async registerPushToken(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('Permission de notification refusée');
        return false;
      }

      const token = await this.getPushToken();
      if (!token) {
        console.error('Impossible d\'obtenir le token push');
        return false;
      }

      const deviceId = this.getDeviceId();
      
      const response = await api.pushTokens.register({
        token,
        device_type: 'web',
        device_id: deviceId
      });

      if (response.ok) {
        console.log('Token push enregistré avec succès');
        localStorage.setItem('push-token-registered', 'true');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erreur enregistrement token push:', error);
      return false;
    }
  }

  /**
   * Afficher une notification locale
   */
  async showNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (!this.getPermissionStatus().granted) {
      console.warn('Permission de notification non accordée');
      return;
    }

    try {
      if (this.registration) {
        // Utiliser le service worker si disponible
        await this.registration.showNotification(title, {
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          ...options
        });
      } else {
        // Notification simple
        new Notification(title, {
          icon: '/icon-192x192.png',
          ...options
        });
      }
    } catch (error) {
      console.error('Erreur affichage notification:', error);
    }
  }

  /**
   * Obtenir un ID unique pour l'appareil
   */
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('device-id');
    if (!deviceId) {
      deviceId = 'web-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
      localStorage.setItem('device-id', deviceId);
    }
    return deviceId;
  }

  /**
   * Vérifier si le token push est déjà enregistré
   */
  isTokenRegistered(): boolean {
    return localStorage.getItem('push-token-registered') === 'true';
  }

  /**
   * Initialiser le service de notifications
   */
  async initialize(): Promise<void> {
    if (!this.isSupported()) {
      console.log('Notifications non supportées sur ce navigateur');
      return;
    }

    // Enregistrer le service worker
    await this.registerServiceWorker();

    // Enregistrer le token si pas déjà fait
    if (!this.isTokenRegistered()) {
      await this.registerPushToken();
    }

    // Écouter les messages du service worker
    this.setupMessageListener();
  }

  /**
   * Configurer l'écoute des messages
   */
  private setupMessageListener(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Message reçu du service worker:', event.data);
        
        // Traiter les notifications reçues
        if (event.data.type === 'notification-click') {
          this.handleNotificationClick(event.data);
        }
      });
    }
  }

  /**
   * Gérer le clic sur une notification
   */
  private handleNotificationClick(data: any): void {
    console.log('Notification cliquée:', data);
    
    // Rediriger selon le type de notification
    switch (data.notificationType) {
      case 'nouvelle_reservation':
        window.location.href = '/prestataire/reservations';
        break;
      case 'reservation_confirmee':
        window.location.href = '/client/reservations';
        break;
      case 'nouvel_avis':
        window.location.href = '/prestataire/avis';
        break;
      default:
        window.location.href = '/dashboard';
    }
  }
}

// Export de l'instance singleton
export const notificationService = NotificationService.getInstance();

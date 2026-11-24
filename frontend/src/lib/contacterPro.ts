import { api } from './api';
import { useAppStore } from '../store/appStore';

/**
 * Ouvre (ou crée) la conversation Chicly avec une pro.
 * Le téléphone n'est partagé qu'après confirmation d'un rendez-vous : avant, on passe par la messagerie.
 */
export async function ouvrirConversationPro(prestataireId: number, navigate: (to: string) => void): Promise<boolean> {
  const { showToast, setCurrentTab } = useAppStore.getState();
  try {
    const { id } = await api.conversations.start(prestataireId);
    try { sessionStorage.setItem('prestaci-open-conversation', String(id)); } catch { /* stockage indisponible */ }
    setCurrentTab('messages');
    navigate('/app/messages');
    return true;
  } catch (e: any) {
    showToast(String(e?.message || '').includes('vous-même') ? 'Tu ne peux pas te contacter toi-même' : 'Impossible d’ouvrir la conversation', 'error');
    return false;
  }
}

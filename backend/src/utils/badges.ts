export interface BadgeInput {
  is_verified?: boolean;
  note_moyenne?: number;
  nombre_avis?: number;
  created_at?: Date | string;
  prestations_terminees: number;
}

export interface Badge {
  id: string;
  label: string;
  emoji: string;
}

/** Badges calculés automatiquement depuis l'activité du prestataire */
export function computeBadges(input: BadgeInput): Badge[] {
  const badges: Badge[] = [];

  if (input.is_verified) {
    badges.push({ id: 'verifie', label: 'Vérifié', emoji: '🛡️' });
  }

  if ((input.note_moyenne || 0) >= 4.5 && (input.nombre_avis || 0) >= 10) {
    badges.push({ id: 'top_note', label: 'Top noté', emoji: '⭐' });
  }

  if (input.prestations_terminees >= 50) {
    badges.push({ id: 'expert', label: '50+ prestations', emoji: '🏆' });
  } else if (input.prestations_terminees >= 10) {
    badges.push({ id: 'confirme', label: '10+ prestations', emoji: '✅' });
  }

  if (input.created_at) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (new Date(input.created_at) < sixMonthsAgo) {
      badges.push({ id: 'membre_fidele', label: 'Membre de longue date', emoji: '🌟' });
    }
  }

  return badges;
}

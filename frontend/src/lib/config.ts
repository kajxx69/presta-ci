// Paiement des abonnements : GeniusPay uniquement (Wave, Orange Money, MTN, Moov, carte).
// L'ancien paiement Wave manuel (capture + validation admin) est MASQUÉ, pas supprimé :
// passer à true pour le réafficher côté prestataire et admin en cas de souci GeniusPay.
export const WAVE_MANUEL_ACTIF = false;

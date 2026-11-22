// Filtre de pertinence des épingles Pinterest importées automatiquement,
// sur leur description : écarte hommes, enfants, animaux et nudité.

/** Jamais dans Chicly : hommes, enfants, animaux, nudité / lingerie. */
const EXCLUS = new Set([
  'man', 'men', 'male', 'boy', 'boys', 'guy', 'beard', 'barber', 'gentleman',
  'child', 'children', 'kid', 'kids', 'toddler', 'baby', 'infant', 'teen', 'teenager', 'little',
  'naked', 'nude', 'nudity', 'topless', 'lingerie', 'bikini', 'underwear', 'erotic', 'sexy', 'sensual', 'bra', 'breasts',
  'horse', 'dog', 'cat', 'animal', 'animals', 'meerkat', 'elephant', 'wildlife', 'zoo', 'bird', 'safari',
  'cosplay', 'goth', 'gothic', 'zombie', 'halloween', 'blood', 'skull',
]);


function mots(texte: string): string[] {
  return texte.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/).filter(Boolean);
}

/**
 * true si la photo est acceptable : aucun mot exclu, et pour chaque groupe
 * requis au moins un mot qui COMMENCE par l'un des termes du groupe
 * (« braid » accepte braids / braided).
 */
export function photoPertinente(etiquettes: string, groupesRequis: string[][] = []): boolean {
  const m = mots(etiquettes);
  if (!m.length) return groupesRequis.length === 0;
  if (m.some(w => EXCLUS.has(w))) return false;
  return groupesRequis.every(groupe => groupe.some(terme => m.some(w => w.startsWith(terme))));
}

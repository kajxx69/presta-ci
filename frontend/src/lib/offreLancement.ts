import { useEffect, useState } from 'react';
import { api } from './api';

// Offre de lancement : 1 mois Pro offert aux 50 premières pros.
// Une seule requête par chargement de page, partagée entre les écrans.
let enCache: Promise<number> | null = null;

/** Nombre de places restantes (0 si l'offre est terminée ou injoignable). */
export function useOffreLancement(): number {
  const [places, setPlaces] = useState(0);
  useEffect(() => {
    enCache ??= api.subscription.offreLancement().then((r) => r.places_restantes).catch(() => 0);
    let actif = true;
    enCache.then((n) => { if (actif) setPlaces(n); });
    return () => { actif = false; };
  }, []);
  return places;
}

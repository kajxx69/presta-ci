import { useRef } from 'react';

/**
 * Distingue un vrai tap d'un défilement ou d'un glissé : le doigt doit rester
 * presque immobile (< 10 px) et peu de temps (< 600 ms). Sinon on n'ouvre rien —
 * sur téléphone, un défilement qui se termine sur une photo ouvrait la fiche.
 */
export function useVraiTap(action: () => void) {
  const depart = useRef<{ x: number; y: number; t: number } | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => { depart.current = { x: e.clientX, y: e.clientY, t: Date.now() }; },
    onPointerCancel: () => { depart.current = null; },
    onPointerUp: (e: React.PointerEvent) => {
      const d = depart.current;
      depart.current = null;
      if (!d) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10 && Date.now() - d.t < 600) action();
    },
  };
}

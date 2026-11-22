import { useEffect, useRef, useState } from 'react';
import { Modele } from '../../lib/api';
import { chargerPinit } from '../../lib/pinterest';

const LARGEUR_PIN = 345; // largeur du widget Pinterest « medium »

/**
 * Épingle Pinterest affichée par le widget OFFICIEL (embedPin) : l'image est
 * servie par Pinterest avec son crédit. Mise à l'échelle pour remplir la largeur.
 * Un calque transparent au-dessus capte le swipe et le tap (sinon le widget
 * ouvrirait Pinterest au moindre toucher).
 */
function EpinglePinterest({ url, compact }: { url: string; compact?: boolean }) {
  const boite = useRef<HTMLDivElement>(null);
  const cible = useRef<HTMLDivElement>(null);
  const [echelle, setEchelle] = useState(1);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    const el = cible.current;
    if (!el) return;
    let actif = true;
    el.innerHTML = '';
    const a = document.createElement('a');
    a.dataset.pinDo = 'embedPin';
    a.dataset.pinWidth = 'medium';
    if (compact) a.dataset.pinTerse = 'true';
    a.href = url;
    el.appendChild(a);
    chargerPinit()
      .then(() => {
        if (!actif) return;
        const build = (window as any).prestaciPinBuild || window.PinUtils?.build;
        build?.(el);
      })
      .catch(() => actif && setErreur(true));
    return () => { actif = false; };
  }, [url, compact]);

  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setEchelle(el.clientWidth / LARGEUR_PIN));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (erreur) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white/80 text-sm p-4 text-center">
        Épingle Pinterest indisponible
      </div>
    );
  }
  return (
    <div ref={boite} className="relative w-full h-full overflow-hidden bg-neutral-900 flex items-center justify-center">
      <div style={{ width: LARGEUR_PIN, transform: `scale(${echelle})`, transformOrigin: 'center center' }} className="flex-shrink-0">
        <div ref={cible} />
      </div>
      {/* Calque : le swipe et le tap restent dans PrestaCI */}
      <div className="absolute inset-0" />
    </div>
  );
}

/** Visuel d'un modèle : photo (Pixabay, prestataire) ou épingle Pinterest. */
export default function ModeleVisuel({ modele, compact, className = '' }: { modele: Modele; compact?: boolean; className?: string }) {
  if (modele.source === 'pinterest' && modele.pin_url) {
    return <div className={className}><EpinglePinterest url={modele.pin_url} compact={compact} /></div>;
  }
  return <img src={modele.photo_url} alt={modele.titre} draggable={false} loading={compact ? 'lazy' : undefined} className={`${className} object-cover pointer-events-none`} />;
}

// Chargement unique du script officiel des widgets Pinterest (pinit.js).

declare global {
  interface Window { PinUtils?: { build: (el?: HTMLElement) => void } }
}

let chargement: Promise<void> | null = null;
export function chargerPinit(): Promise<void> {
  if (window.PinUtils) return Promise.resolve();
  if (!chargement) {
    chargement = new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = 'https://assets.pinterest.com/js/pinit.js';
      s.async = true;
      s.defer = true;
      s.dataset.pinBuild = 'prestaciPinBuild';
      s.onload = () => ok();
      s.onerror = () => { chargement = null; ko(new Error('pinit.js')); };
      document.body.appendChild(s);
    });
  }
  return chargement;
}

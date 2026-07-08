import { useEffect } from 'react';

const DEFAULT_TITLE = "PrestaCI - Services de proximité en Côte d'Ivoire";
const DEFAULT_DESCRIPTION = "Découvrez, réservez et partagez des prestations de services en Côte d'Ivoire";

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

/**
 * Met à jour le titre et les meta description/OpenGraph de la page.
 * Restaure les valeurs par défaut au démontage.
 */
export function usePageMeta(title?: string | null, description?: string | null) {
  useEffect(() => {
    const finalTitle = title ? `${title} | PrestaCI` : DEFAULT_TITLE;
    const finalDescription = (description || DEFAULT_DESCRIPTION).slice(0, 160);

    document.title = finalTitle;
    setMeta('name', 'description', finalDescription);
    setMeta('property', 'og:title', finalTitle);
    setMeta('property', 'og:description', finalDescription);
    setMeta('property', 'og:url', window.location.href);

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('name', 'description', DEFAULT_DESCRIPTION);
      setMeta('property', 'og:title', DEFAULT_TITLE);
      setMeta('property', 'og:description', DEFAULT_DESCRIPTION);
    };
  }, [title, description]);
}

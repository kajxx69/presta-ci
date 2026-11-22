// Réduit une photo (capture Pinterest, galerie) avant envoi : 1600 px max,
// JPEG, < 1,8 Mo (le serveur refuse au-delà de 2 Mo).
export async function compresserImage(fichier: File): Promise<string> {
  if (!/^image\//.test(fichier.type)) throw new Error('Choisis une image (photo ou capture d\'écran)');
  const url = URL.createObjectURL(fichier);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ko(new Error('Image illisible'));
      i.src = url;
    });
    let cote = 1600;
    for (let essai = 0; essai < 5; essai++) {
      const ratio = Math.min(1, cote / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/jpeg', 0.82);
      if (data.length * 0.75 < 1.8 * 1024 * 1024) return data;
      cote = Math.round(cote * 0.75);
    }
    throw new Error('Image trop lourde');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Premier lien http(s) trouvé dans un texte partagé (Pinterest met souvent le lien dans le texte). */
export function extraireLien(...textes: (string | null | undefined)[]): string {
  for (const t of textes) {
    const m = (t || '').match(/https?:\/\/[^\s]+/);
    if (m) return m[0];
  }
  return '';
}

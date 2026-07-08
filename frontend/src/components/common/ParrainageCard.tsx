import { useEffect, useState } from 'react';
import { Gift, Copy, Check, Share2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';

/** Carte "Parrainez vos amis" : code personnel, copie, partage WhatsApp, compteur de filleuls */
export default function ParrainageCard() {
  const [data, setData] = useState<{ code: string; filleuls: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const { showToast } = useAppStore();

  useEffect(() => {
    api.users.getParrainage().then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  const shareText = `Rejoins-moi sur PrestaCI, l'appli pour trouver et réserver les meilleurs prestataires en Côte d'Ivoire ! Utilise mon code ${data.code} à l'inscription 🎁 ${window.location.origin}/register`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Impossible de copier', 'error');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'PrestaCI', text: shareText });
        return;
      } catch { /* annulé par l'utilisateur */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-5 text-white shadow-brand">
      <div className="flex items-center gap-2 mb-1.5">
        <Gift className="w-5 h-5" />
        <h3 className="font-bold">Parrainez vos amis</h3>
      </div>
      <p className="text-sm text-white/85">
        Partagez votre code et suivez vos filleuls.
        {data.filleuls > 0 && (
          <span className="font-semibold"> Déjà {data.filleuls} filleul{data.filleuls > 1 ? 's' : ''} 🎉</span>
        )}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors font-mono font-bold tracking-wider text-sm"
        >
          {data.code}
          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4 text-white/70" />}
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Partager
        </button>
      </div>
    </div>
  );
}

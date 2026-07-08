import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Download, Share2, MessageCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  nom: string;
  url: string;
}

/** Partage d'un profil prestataire : lien, WhatsApp, partage natif et QR code imprimable */
export default function ShareProfileModal({ open, onClose, nom, url }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const shareText = `Découvrez ${nom} sur PrestaCI — consultez les services et réservez en ligne : ${url}`;

  useEffect(() => {
    if (open && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 220,
        margin: 2,
        color: { dark: '#312e81', light: '#ffffff' },
      }).catch(() => {});
    }
  }, [open, url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard indisponible */ }
  };

  const handleDownloadQr = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `prestaci-${nom.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: nom, text: shareText, url }); } catch { /* annulé */ }
    } else {
      handleCopy();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Partager ce profil" size="sm">
      <div className="space-y-5">
        {/* QR code */}
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-white rounded-2xl ring-1 ring-gray-200">
            <canvas ref={canvasRef} />
          </div>
          <button
            onClick={handleDownloadQr}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger le QR code (à imprimer en boutique)
          </button>
        </div>

        {/* Lien */}
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-left"
        >
          <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{url}</span>
          {copied ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <Copy className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </button>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] text-white font-semibold text-sm hover:brightness-105 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </a>
          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-sm shadow-brand hover:brightness-110 transition-all"
          >
            <Share2 className="w-4 h-4" />
            Partager
          </button>
        </div>
      </div>
    </Modal>
  );
}

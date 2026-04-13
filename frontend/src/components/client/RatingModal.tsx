import { useState } from 'react';
import { Star, Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: any;
  onSuccess: () => void;
}

const ratingLabels: Record<number, { label: string; emoji: string }> = {
  1: { label: 'Très insatisfait', emoji: '😞' },
  2: { label: 'Insatisfait', emoji: '😕' },
  3: { label: 'Correct', emoji: '😐' },
  4: { label: 'Satisfait', emoji: '😊' },
  5: { label: 'Excellent !', emoji: '🤩' },
};

export default function RatingModal({ isOpen, onClose, reservation, onSuccess }: RatingModalProps) {
  const { showToast } = useAppStore();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    files.forEach(file => {
      if (!file.type.startsWith('image/')) { showToast('Veuillez sélectionner des images', 'error'); return; }
      if (file.size > 5 * 1024 * 1024) { showToast('Les images ne doivent pas dépasser 5MB', 'error'); return; }
      const reader = new FileReader();
      reader.onload = () => setPhotos(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    if (rating === 0) { showToast('Veuillez donner une note', 'error'); return; }
    try {
      setLoading(true);
      await api.avis.create({
        reservation_id: reservation.id,
        note: rating,
        commentaire: comment.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
      });
      showToast('Avis publié avec succès !', 'success');
      onSuccess();
      onClose();
      setRating(0); setComment(''); setPhotos([]);
    } catch (error: any) {
      showToast(error.message || "Erreur lors de l'ajout de l'avis", 'error');
    } finally {
      setLoading(false);
    }
  };

  const activeRating = hoveredRating || rating;

  return (
    <Modal open={isOpen} onClose={onClose} title="Noter le service" size="md">
      {reservation && (
        <div className="space-y-5">
          {/* Service info */}
          <div className="text-center">
            <h3 className="font-bold text-gray-900 dark:text-white">{reservation.service_nom}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{reservation.prestataire_nom}</p>
          </div>

          {/* Stars */}
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Comment évaluez-vous ce service ?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <motion.button
                  key={star}
                  whileTap={{ scale: 0.8 }}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1"
                >
                  <Star
                    className={`w-9 h-9 transition-all duration-150 ${
                      star <= activeRating
                        ? 'text-yellow-400 fill-yellow-400 drop-shadow-lg scale-110'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </motion.button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              {activeRating > 0 && (
                <motion.p
                  key={activeRating}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2"
                >
                  {ratingLabels[activeRating]?.emoji} {ratingLabels[activeRating]?.label}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Commentaire <span className="text-gray-400">(optionnel)</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Partagez votre expérience..."
              rows={3}
              className="w-full p-3 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Photos <span className="text-gray-400">(optionnel)</span>
            </label>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photos.map((photo, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-400 transition-colors cursor-pointer">
              <Camera className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Ajouter des photos</span>
              <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" fullWidth onClick={onClose}>Annuler</Button>
            <Button fullWidth loading={loading} disabled={rating === 0} onClick={handleSubmit}>
              Publier l'avis
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

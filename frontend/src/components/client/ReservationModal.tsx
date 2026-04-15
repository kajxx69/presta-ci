import { useState } from 'react';
import { Calendar, Clock, Home, MessageSquare, ArrowRight, ChevronLeft, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { fr } from 'date-fns/locale';
import { api } from '../../lib/api';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

const availableTimes = Array.from({ length: 18 }, (_, i) => {
  const hour = 8 + Math.floor((i * 30) / 60);
  const minute = (i * 30) % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

const ratingLabels: Record<number, string> = {
  1: 'Très insatisfait', 2: 'Insatisfait', 3: 'Correct', 4: 'Satisfait', 5: 'Excellent !',
};

export default function ReservationModal({ service, onClose, onReservationSuccess, publicationId }: any) {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isDomicile, setIsDomicile] = useState(false);
  const [adresseRdv, setAdresseRdv] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      setError('Veuillez sélectionner une date et une heure.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const newReservation = await api.reservations.create({
        service_id: service.id,
        date_reservation: selectedDate.toISOString().split('T')[0],
        heure_debut: selectedTime,
        notes_client: notes,
        a_domicile: isDomicile,
        adresse_rdv: isDomicile ? adresseRdv : '',
        publication_id: publicationId || null,
      });
      setSuccess(true);
      setTimeout(() => {
        onReservationSuccess(newReservation);
        onClose();
      }, 1500);
    } catch (e: any) {
      setError(e.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = !!selectedDate && !!selectedTime;

  return (
    <Modal open title={`Réserver : ${service.nom}`} onClose={onClose} size="md">
      {/* Success state */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 flex flex-col items-center gap-3 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Réservation confirmée !</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Votre demande est en attente de confirmation par le prestataire.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!success && (
        <>
          {/* Service summary */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{service.nom}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{service.duree_minutes}min</p>
            </div>
            <span className="text-lg font-bold text-gradient">
              {service.prix?.toLocaleString()} {service.devise || 'XOF'}
            </span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-4">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  s === step ? 'bg-blue-600 text-white' :
                  s < step ? 'bg-emerald-500 text-white' :
                  'bg-gray-200 dark:bg-gray-700 text-gray-400'
                }`}>
                  {s < step ? '✓' : s}
                </div>
                {s < 2 && <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 w-8" />}
              </div>
            ))}
            <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              {step === 1 ? 'Date & heure' : 'Détails'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-1">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold">Choisissez une date</span>
                </div>
                <div className="flex justify-center">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    locale={fr}
                    disabled={{ before: new Date() }}
                    className="!m-0"
                  />
                </div>

                {selectedDate && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-semibold">Choisissez une heure</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {availableTimes.map(time => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`px-2 py-2 text-sm rounded-lg font-medium transition-all ${
                            selectedTime === time
                              ? 'bg-blue-600 text-white shadow-md scale-105'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Recap */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-sm">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    📅 {selectedDate?.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">🕐 {selectedTime}</p>
                </div>

                {service.is_domicile && (
                  <div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                      <Home className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-semibold">Service à domicile</span>
                    </div>
                    <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDomicile}
                        onChange={e => setIsDomicile(e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-200">
                        Le prestataire vient à mon adresse
                      </span>
                    </label>
                    {isDomicile && (
                      <input
                        type="text"
                        value={adresseRdv}
                        onChange={e => setAdresseRdv(e.target.value)}
                        placeholder="Votre adresse complète"
                        className="mt-2 w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold">Notes (optionnel)</span>
                  </div>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Instructions particulières..."
                    className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="mt-5 flex gap-3">
            {step === 2 && (
              <Button variant="secondary" onClick={() => setStep(1)} icon={ChevronLeft}>
                Retour
              </Button>
            )}
            {step === 1 ? (
              <Button
                fullWidth
                disabled={!canProceed}
                onClick={() => setStep(2)}
                iconRight={ArrowRight}
              >
                Suivant
              </Button>
            ) : (
              <Button fullWidth loading={loading} onClick={handleSubmit}>
                Confirmer — {service.prix?.toLocaleString()} {service.devise || 'XOF'}
              </Button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

import { useEffect, useState } from 'react';
import { Calendar, Clock, Home, MessageSquare, ArrowRight, ChevronLeft, Minus, Plus, Package, FileText, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { fr } from 'date-fns/locale';
import { api } from '../../lib/api';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SuccessCheck } from '../ui/SuccessCheck';

// Grille par défaut, utilisée seulement si le prestataire n'a pas défini d'horaires
const fallbackTimes = Array.from({ length: 18 }, (_, i) => {
  const hour = 8 + Math.floor((i * 30) / 60);
  const minute = (i * 30) % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

// Format YYYY-MM-DD en heure locale (toISOString décale la date selon le fuseau)
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface Slot { heure_debut: string; heure_fin: string; disponible: boolean }

export default function ReservationModal({ service, onClose, onReservationSuccess, publicationId }: any) {
  // Determine booking type from subcategory (passed via service.booking_type or fetched)
  const [bookingType, setBookingType] = useState<'appointment' | 'order'>('appointment');
  const [typeLoaded, setTypeLoaded] = useState(false);

  useEffect(() => {
    // Try to get booking_type from service directly, else fetch subcategory
    if (service.booking_type) {
      setBookingType(service.booking_type);
      setTypeLoaded(true);
      return;
    }
    if (service.sous_categorie_id) {
      api.getSubCategories().then(subs => {
        const sub = subs.find(s => s.id === Number(service.sous_categorie_id));
        if (sub?.booking_type) setBookingType(sub.booking_type);
      }).catch(() => {}).finally(() => setTypeLoaded(true));
    } else {
      setTypeLoaded(true);
    }
  }, [service]);

  // — Shared state —
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [quantite, setQuantite] = useState<number>(service.quantite_min || 1);
  const [isDomicile, setIsDomicile] = useState(false);
  const [adresseRdv, setAdresseRdv] = useState('');
  const [adresseCoords, setAdresseCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const handleUseMyPosition = () => {
    if (!('geolocation' in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setAdresseCoords({ lat: latitude, lng: longitude });
        try {
          const res = await api.geo.reverse(latitude, longitude);
          setAdresseRdv(res.label);
        } catch {
          setAdresseRdv(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // — Appointment-specific —
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [recurrent, setRecurrent] = useState(false);
  const [recurrenceSemaines, setRecurrenceSemaines] = useState(4);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [horairesDefinis, setHorairesDefinis] = useState(true);

  // Charger les créneaux réels dès qu'une date est choisie (rendez-vous uniquement)
  useEffect(() => {
    if (bookingType !== 'appointment' || !selectedDate || !service?.id) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlots(null);
    api.getServiceSlots(Number(service.id), toLocalDateString(selectedDate))
      .then(res => {
        if (cancelled) return;
        setSlots(res.slots);
        setHorairesDefinis(res.horaires_definis);
      })
      .catch(() => {
        if (cancelled) return;
        // En cas d'erreur réseau, on retombe sur la grille par défaut
        setSlots(null);
        setHorairesDefinis(false);
      })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [bookingType, selectedDate, service?.id]);

  // — Order-specific —
  const [specifications, setSpecifications] = useState('');

  const prixTotal = (service.prix || 0) * quantite;
  const quantiteMax = service.quantite_max || 99;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        service_id: service.id,
        date_reservation: toLocalDateString(selectedDate!),
        a_domicile: isDomicile,
        adresse_rdv: isDomicile ? adresseRdv : '',
        adresse_rdv_lat: isDomicile && adresseCoords ? adresseCoords.lat : undefined,
        adresse_rdv_lng: isDomicile && adresseCoords ? adresseCoords.lng : undefined,
        publication_id: publicationId || null,
        quantite,
      };

      if (bookingType === 'appointment') {
        payload.heure_debut = selectedTime;
        payload.notes_client = notes;
        if (recurrent) payload.recurrence_semaines = recurrenceSemaines;
      } else {
        payload.specifications = specifications;
        payload.notes_client = notes;
      }

      const newReservation = await api.reservations.create(payload);
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

  const canProceedStep1 = bookingType === 'appointment'
    ? !!selectedDate && !!selectedTime
    : !!selectedDate;

  const canSubmit = (bookingType === 'order' ? specifications.trim().length > 0 : true)
    && (!isDomicile || adresseRdv.trim().length > 0);

  const totalSteps = 2;

  if (!typeLoaded) return null;

  return (
    <Modal open title={`${bookingType === 'order' ? 'Commander' : 'Réserver'} : ${service.nom}`} onClose={onClose} size="md">

      {/* Success */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-8 flex flex-col items-center gap-3 text-center"
          >
            <SuccessCheck size={72} />
            <motion.h3
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-xl font-bold text-gray-900 dark:text-white"
            >
              {bookingType === 'order' ? 'Commande envoyée !' : 'Réservation confirmée !'}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-gray-500 dark:text-gray-400"
            >
              {bookingType === 'order'
                ? 'Le prestataire va analyser votre commande et vous recontacter.'
                : 'Votre demande est en attente de confirmation par le prestataire.'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {!success && (
        <>
          {/* Service summary */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{service.nom}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {bookingType === 'order'
                    ? <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Commande</span>
                    : `${service.duree_minutes}min`}
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-gradient">
                  {prixTotal.toLocaleString()} {service.devise || 'XOF'}
                </span>
                {quantite > 1 && (
                  <p className="text-xs text-gray-400">
                    {service.prix?.toLocaleString()} × {quantite}{service.unite ? ` ${service.unite}` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Quantity selector — shown for orders always, for appointments only if unite is set */}
            {(bookingType === 'order' || service.unite) && (
              <div className="mt-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Quantité{service.unite ? ` (${service.unite})` : ''}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantite(q => Math.max(service.quantite_min || 1, q - 1))}
                    disabled={quantite <= (service.quantite_min || 1)}
                    className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center disabled:opacity-40 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-bold text-gray-900 dark:text-white text-sm">{quantite}</span>
                  <button
                    onClick={() => setQuantite(q => Math.min(quantiteMax, q + 1))}
                    disabled={quantite >= quantiteMax}
                    className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center disabled:opacity-40 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-4">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  s === step ? 'bg-blue-600 text-white' :
                  s < step ? 'bg-emerald-500 text-white' :
                  'bg-gray-200 dark:bg-gray-700 text-gray-400'
                }`}>
                  {s < step ? '✓' : s}
                </div>
                {s < totalSteps && <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 w-8" />}
              </div>
            ))}
            <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              {bookingType === 'appointment'
                ? (step === 1 ? 'Date & heure' : 'Détails')
                : (step === 1 ? 'Date souhaitée' : 'Spécifications')}
            </p>
          </div>

          <AnimatePresence mode="wait">

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">

                {/* Date picker — same for both types */}
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-1">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold">
                    {bookingType === 'order' ? 'Date souhaitée de livraison / intervention' : 'Choisissez une date'}
                  </span>
                </div>
                <div className="flex justify-center">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={date => { setSelectedDate(date); setSelectedTime(null); }}
                    locale={fr}
                    disabled={{ before: new Date() }}
                    className="!m-0"
                  />
                </div>

                {/* Time slots — appointment only */}
                {bookingType === 'appointment' && selectedDate && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-semibold">Choisissez une heure</span>
                    </div>

                    {slotsLoading && (
                      <div className="flex items-center justify-center py-6 text-sm text-gray-400">
                        Chargement des disponibilités…
                      </div>
                    )}

                    {!slotsLoading && slots && slots.length > 0 && (
                      <div className="grid grid-cols-4 gap-1.5">
                        {slots.map(slot => (
                          <button
                            key={slot.heure_debut}
                            onClick={() => slot.disponible && setSelectedTime(slot.heure_debut)}
                            disabled={!slot.disponible}
                            className={`px-2 py-2 text-sm rounded-lg font-medium transition-all ${
                              selectedTime === slot.heure_debut
                                ? 'bg-blue-600 text-white shadow-md scale-105'
                                : slot.disponible
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                : 'bg-gray-50 dark:bg-gray-800/50 text-gray-300 dark:text-gray-600 line-through cursor-not-allowed'
                            }`}
                          >
                            {slot.heure_debut}
                          </button>
                        ))}
                      </div>
                    )}

                    {!slotsLoading && slots && slots.length === 0 && horairesDefinis && (
                      <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
                        Le prestataire est fermé ce jour-là. Choisissez une autre date.
                      </p>
                    )}

                    {!slotsLoading && (!slots || slots.length === 0) && !horairesDefinis && (
                      <div className="grid grid-cols-4 gap-1.5">
                        {fallbackTimes.map(time => (
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
                    )}
                  </motion.div>
                )}

                {/* Order hint */}
                {bookingType === 'order' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
                    <Truck className="inline w-3.5 h-3.5 mr-1 text-amber-600" />
                    Le prestataire confirmera la date après réception de votre commande.
                  </p>
                )}
              </motion.div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">

                {/* Recap */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-sm">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    📅 {selectedDate?.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  {bookingType === 'appointment' && selectedTime && (
                    <p className="text-blue-700 dark:text-blue-300">🕐 {selectedTime}</p>
                  )}
                  {bookingType === 'order' && (
                    <p className="text-blue-700 dark:text-blue-300">
                      📦 {quantite} {service.unite || 'unité(s)'} — {prixTotal.toLocaleString()} {service.devise || 'XOF'}
                    </p>
                  )}
                </div>

                {/* Specifications — orders only (required) */}
                {bookingType === 'order' && (
                  <div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-semibold">Spécifications de votre commande *</span>
                    </div>
                    <textarea
                      value={specifications}
                      onChange={e => setSpecifications(e.target.value)}
                      rows={4}
                      placeholder={
                        service.nom?.toLowerCase().includes('carte') || service.nom?.toLowerCase().includes('flyer')
                          ? 'Ex: 500 cartes, format 9×5cm, fond blanc, logo fourni en PDF...'
                          : service.nom?.toLowerCase().includes('buffet') || service.nom?.toLowerCase().includes('plat')
                          ? 'Ex: 50 personnes, menu végétarien inclus, allergies à préciser...'
                          : service.nom?.toLowerCase().includes('bouquet') || service.nom?.toLowerCase().includes('décoration')
                          ? 'Ex: Couleurs souhaitées, thème, occasion, lieu de livraison...'
                          : 'Décrivez précisément vos besoins, couleurs, tailles, quantités, références...'
                      }
                      className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    {specifications.trim().length === 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Les spécifications sont requises pour traiter votre commande.</p>
                    )}
                  </div>
                )}

                {/* Domicile */}
                {service.is_domicile && (
                  <div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                      <Home className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-semibold">
                        {bookingType === 'order' ? 'Livraison à domicile' : 'Service à domicile'}
                      </span>
                    </div>
                    <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDomicile}
                        onChange={e => setIsDomicile(e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-200">
                        {bookingType === 'order' ? 'Livrer à mon adresse' : 'Le prestataire vient à mon adresse'}
                      </span>
                    </label>
                    {isDomicile && (
                      <>
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={adresseRdv}
                            onChange={e => { setAdresseRdv(e.target.value); setAdresseCoords(null); }}
                            placeholder="Votre adresse complète"
                            className="flex-1 px-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={handleUseMyPosition}
                            disabled={locating}
                            title="Utiliser ma position GPS"
                            className="px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 flex-shrink-0"
                          >
                            {locating ? '…' : '📍 GPS'}
                          </button>
                        </div>
                        {adresseCoords && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                            ✓ Position GPS précise enregistrée — le prestataire aura l'itinéraire exact.
                          </p>
                        )}
                        {adresseRdv.trim().length === 0 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">L'adresse est requise.</p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Récurrence hebdomadaire — rendez-vous uniquement */}
                {bookingType === 'appointment' && (
                  <div className="bg-blue-50/60 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/40 rounded-xl p-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={recurrent}
                        onChange={e => setRecurrent(e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        🔁 Répéter chaque semaine, même jour et même heure
                      </span>
                    </label>
                    {recurrent && (
                      <div className="mt-2.5 flex items-center gap-2 pl-7">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Pendant</span>
                        <select
                          value={recurrenceSemaines}
                          onChange={e => setRecurrenceSemaines(Number(e.target.value))}
                          className="px-2.5 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                        >
                          {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} semaines</option>)}
                        </select>
                        <span className="text-xs text-gray-400">(les créneaux déjà pris seront sautés)</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold">
                      {bookingType === 'order' ? 'Notes complémentaires (optionnel)' : 'Notes (optionnel)'}
                    </span>
                  </div>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    placeholder={bookingType === 'order' ? 'Informations supplémentaires...' : 'Instructions particulières...'}
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
              <Button fullWidth disabled={!canProceedStep1} onClick={() => setStep(2)} iconRight={ArrowRight}>
                Suivant
              </Button>
            ) : (
              <Button fullWidth loading={loading} disabled={!canSubmit} onClick={handleSubmit}>
                {bookingType === 'order'
                  ? `Commander — ${prixTotal.toLocaleString()} ${service.devise || 'XOF'}`
                  : `Confirmer — ${prixTotal.toLocaleString()} ${service.devise || 'XOF'}`}
              </Button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

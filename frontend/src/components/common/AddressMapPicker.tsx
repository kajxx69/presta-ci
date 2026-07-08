import { useState, useEffect, useRef } from 'react';
import { MapPin, Check, X, Search, Loader2, LocateFixed } from 'lucide-react';
import MapView from '../map/MapView';
import { api } from '../../lib/api';

interface AddressMapPickerProps {
  value: string;
  onChange: (address: string, latitude?: number, longitude?: number) => void;
  placeholder?: string;
  required?: boolean;
}

interface GeoSuggestion {
  label: string;
  label_court: string;
  lat: number;
  lng: number;
}

export default function AddressMapPicker({ value, onChange, placeholder, required }: AddressMapPickerProps) {
  const [showMap, setShowMap] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | undefined>(undefined);
  const [tempAddress, setTempAddress] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const [userPosition, setUserPosition] = useState<[number, number] | undefined>(undefined);

  // Autocomplete d'adresse (via le proxy backend, limité à la Côte d'Ivoire)
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Centre par défaut : Abidjan
  const defaultCenter: [number, number] = [5.345317, -4.024429];

  useEffect(() => {
    setTempAddress(value);
  }, [value]);

  // Recherche d'adresse débouncée
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (addressQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.geo.search(addressQuery.trim());
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [addressQuery]);

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const res = await api.geo.reverse(lat, lng);
      setTempAddress(res.label || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch {
      setTempAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const locateMe = () => {
    if (!('geolocation' in navigator)) return;
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const pos: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserPosition(pos);
        setSelectedPosition(pos);
        await reverseGeocode(pos[0], pos[1]);
      },
      () => setIsLoading(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Position de l'utilisateur à l'ouverture de la carte
  useEffect(() => {
    if (showMap && !selectedPosition) locateMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap]);

  const handleMapClick = async ({ lat, lng }: { lat: number; lng: number }) => {
    setSelectedPosition([lat, lng]);
    await reverseGeocode(lat, lng);
  };

  const handleSuggestionSelect = (s: GeoSuggestion) => {
    setSelectedPosition([s.lat, s.lng]);
    setTempAddress(s.label);
    setSuggestions([]);
    setAddressQuery('');
  };

  const handleValidate = () => {
    if (selectedPosition) {
      onChange(tempAddress, selectedPosition[0], selectedPosition[1]);
    } else {
      onChange(tempAddress);
    }
    setShowMap(false);
  };

  const handleCancel = () => {
    setShowMap(false);
    setTempAddress(value);
    setSelectedPosition(undefined);
    setUserPosition(undefined);
    setSuggestions([]);
    setAddressQuery('');
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onFocus={() => setShowMap(true)}
          onChange={(e) => {
            setTempAddress(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full pl-10 pr-4 py-3.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:shadow-md transition-all duration-200"
          placeholder={placeholder || "Cliquez pour sélectionner sur la carte"}
          required={required}
        />
      </div>

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-[6px]">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-soft-lg ring-1 ring-gray-900/[0.06] dark:ring-white/[0.08] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header + recherche d'adresse */}
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Localisez votre emplacement
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Cherchez une adresse, cliquez sur la carte, ou utilisez votre position.
                  </p>
                </div>
                <button
                  onClick={locateMe}
                  title="Utiliser ma position"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex-shrink-0"
                >
                  <LocateFixed className="w-4 h-4" />
                  Ma position
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={addressQuery}
                  onChange={e => setAddressQuery(e.target.value)}
                  placeholder="Ex: Rue des Jardins, Deux-Plateaux, Cocody…"
                  className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}

                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-soft-lg overflow-hidden max-h-52 overflow-y-auto">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionSelect(s)}
                        className="w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-blue-50/60 dark:hover:bg-blue-900/15 transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-gray-900 dark:text-white">{s.label_court}</span>
                          <span className="block text-xs text-gray-400 truncate">{s.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Map */}
            <div className="relative flex-1" style={{ minHeight: '250px' }}>
              <MapView
                center={selectedPosition || userPosition || defaultCenter}
                zoom={selectedPosition ? 16 : 12}
                markers={[]}
                onMapClick={handleMapClick}
                selectedPosition={selectedPosition}
                userLocation={userPosition}
              />

              {isLoading && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    📍 Localisation en cours…
                  </p>
                </div>
              )}
            </div>

            {/* Address Preview */}
            {selectedPosition && (
              <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white mb-1">
                      Adresse sélectionnée :
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words">
                      {tempAddress}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                      {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCancel}
                className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-all duration-200 text-sm"
              >
                <X className="w-4 h-4" />
                <span>Annuler</span>
              </button>

              <button
                onClick={handleValidate}
                disabled={!selectedPosition}
                className={`flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm ${
                  selectedPosition
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-brand hover:brightness-110'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Valider cette position</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

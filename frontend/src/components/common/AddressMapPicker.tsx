import { useState, useEffect } from 'react';
import { MapPin, Check, X } from 'lucide-react';
import MapView from '../map/MapView';

interface AddressMapPickerProps {
  value: string;
  onChange: (address: string, latitude?: number, longitude?: number) => void;
  placeholder?: string;
  required?: boolean;
}

export default function AddressMapPicker({ value, onChange, placeholder, required }: AddressMapPickerProps) {
  const [showMap, setShowMap] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | undefined>(undefined);
  const [tempAddress, setTempAddress] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const [userPosition, setUserPosition] = useState<[number, number] | undefined>(undefined);

  // Centre par défaut : Abidjan
  const defaultCenter: [number, number] = [5.345317, -4.024429];

  useEffect(() => {
    setTempAddress(value);
  }, [value]);

  // Récupérer la position de l'utilisateur à l'ouverture de la carte
  useEffect(() => {
    if (showMap && !selectedPosition && 'geolocation' in navigator) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const pos: [number, number] = [latitude, longitude];
          setUserPosition(pos);
          setSelectedPosition(pos);
          
          // Faire le reverse geocoding automatiquement
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
              {
                headers: {
                  'Accept-Language': 'fr'
                }
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              const formattedAddress = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
              setTempAddress(formattedAddress);
            } else {
              setTempAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            }
          } catch (error) {
            console.error('Erreur reverse geocoding:', error);
            setTempAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          } finally {
            setIsLoading(false);
          }
        },
        (error) => {
          console.error('Erreur géolocalisation:', error);
          setIsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [showMap, selectedPosition]);

  const handleMapClick = async ({ lat, lng }: { lat: number; lng: number }) => {
    setSelectedPosition([lat, lng]);
    setIsLoading(true);

    try {
      // Reverse geocoding avec Nominatim (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'fr'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const formattedAddress = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setTempAddress(formattedAddress);
      } else {
        setTempAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (error) {
      console.error('Erreur reverse geocoding:', error);
      setTempAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsLoading(false);
    }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                Sélectionnez votre emplacement
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Votre position actuelle est affichée. Cliquez pour la modifier.
              </p>
            </div>

            {/* Map */}
            <div className="relative flex-1" style={{ minHeight: '250px' }}>
              <MapView
                center={selectedPosition || userPosition || defaultCenter}
                zoom={selectedPosition ? 15 : 12}
                markers={[]}
                onMapClick={handleMapClick}
                selectedPosition={selectedPosition}
                userLocation={userPosition}
              />
              
              {isLoading && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    📍 Récupération de votre position...
                  </p>
                </div>
              )}
            </div>

            {/* Address Preview */}
            {selectedPosition && (
              <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 ">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white mb-1">
                      Adresse sélectionnée :
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words">
                      {tempAddress}
                    </p>
                    {/* <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 mt-1">
                      GPS : {selectedPosition[0].toFixed(4)}, {selectedPosition[1].toFixed(4)}
                    </p> */}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCancel}
                className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-all duration-200 text-sm sm:text-base"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Annuler</span>
              </button>
              
              <button
                onClick={handleValidate}
                disabled={!selectedPosition}
                className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-sm sm:text-base ${
                  selectedPosition
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:scale-105'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Valider</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

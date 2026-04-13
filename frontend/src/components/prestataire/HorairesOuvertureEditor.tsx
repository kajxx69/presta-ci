import { useState, useEffect } from 'react';

const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

interface Horaires {
  [key: string]: { debut: string; fin: string } | null;
}

interface Props {
  value: Horaires | null;
  onChange: (value: Horaires) => void;
}

export default function HorairesOuvertureEditor({ value, onChange }: Props) {
  const [horaires, setHoraires] = useState<Horaires>({});

  useEffect(() => {
    if (value) {
      setHoraires(value);
    } else {
      // Initialiser avec des valeurs par défaut si null
      const defaultHoraires: Horaires = {};
      jours.forEach(jour => {
        defaultHoraires[jour] = { debut: '09:00', fin: '18:00' };
      });
      setHoraires(defaultHoraires);
    }
  }, [value]);

  const handleTimeChange = (jour: string, type: 'debut' | 'fin', time: string) => {
    const newHoraires = {
      ...horaires,
      [jour]: {
        ...(horaires[jour] || { debut: '', fin: '' }),
        [type]: time,
      },
    };
    setHoraires(newHoraires);
    onChange(newHoraires);
  };

  const toggleJour = (jour: string) => {
    const newHoraires = { ...horaires };
    if (newHoraires[jour]) {
      newHoraires[jour] = null; // Fermé
    } else {
      newHoraires[jour] = { debut: '09:00', fin: '18:00' }; // Ouvert avec défaut
    }
    setHoraires(newHoraires);
    onChange(newHoraires);
  };

  return (
    <div className="space-y-3">
      {jours.map((jour) => (
        <div key={jour} className="grid grid-cols-3 items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
          <div className="col-span-1 flex items-center">
            <input
              type="checkbox"
              checked={!!horaires[jour]}
              onChange={() => toggleJour(jour)}
              className="mr-2 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="capitalize font-medium text-sm text-gray-800 dark:text-gray-200">{jour}</span>
          </div>
          {horaires[jour] ? (
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <input
                type="time"
                value={horaires[jour]?.debut || ''}
                onChange={(e) => handleTimeChange(jour, 'debut', e.target.value)}
                className="w-full p-1.5 border rounded-md text-sm"
              />
              <input
                type="time"
                value={horaires[jour]?.fin || ''}
                onChange={(e) => handleTimeChange(jour, 'fin', e.target.value)}
                className="w-full p-1.5 border rounded-md text-sm"
              />
            </div>
          ) : (
            <div className="col-span-2 text-center text-sm text-gray-500">Fermé</div>
          )}
        </div>
      ))}
    </div>
  );
}

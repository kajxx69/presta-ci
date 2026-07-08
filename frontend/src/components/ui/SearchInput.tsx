import { useState, useEffect, useRef } from 'react';
import { Search, X, Mic } from 'lucide-react';
import { clsx } from 'clsx';

export interface SearchSuggestion {
  id: string;
  label: string;
  sublabel?: string;
  emoji?: string;
  onSelect: () => void;
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
  /** Active le bouton de recherche vocale (si le navigateur le supporte) */
  voice?: boolean;
  /** Fournit des suggestions affichées en dropdown pendant la saisie */
  onFetchSuggestions?: (query: string) => Promise<SearchSuggestion[]>;
}

const SpeechRecognitionImpl: any =
  typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

export function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher...',
  debounceMs = 300,
  className,
  autoFocus = false,
  voice = false,
  onFetchSuggestions,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [listening, setListening] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const fetchSuggestions = (query: string) => {
    if (!onFetchSuggestions) return;
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const results = await onFetchSuggestions(query.trim());
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  };

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    fetchSuggestions(newValue);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  };

  const handleClear = () => {
    setLocalValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    onChange('');
  };

  const handleVoice = () => {
    if (!SpeechRecognitionImpl) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognitionImpl();
    recognitionRef.current = recognition;
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setLocalValue(transcript);
        onChange(transcript);
        fetchSuggestions(transcript);
      }
    };
    recognition.start();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
      recognitionRef.current?.abort?.();
    };
  }, []);

  const showVoice = voice && !!SpeechRecognitionImpl;

  return (
    <div className={clsx('relative group', className)}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 dark:text-gray-500 pointer-events-none transition-colors group-focus-within:text-blue-500" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder={listening ? 'Je vous écoute…' : placeholder}
        autoFocus={autoFocus}
        className={clsx(
          'w-full pl-11 py-3 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-soft focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200',
          showVoice ? 'pr-[4.5rem]' : 'pr-10',
        )}
      />

      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {localValue && (
          <button
            onClick={handleClear}
            className="p-1 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-500 dark:text-gray-300" />
          </button>
        )}
        {showVoice && (
          <button
            onClick={handleVoice}
            title="Recherche vocale"
            className={clsx(
              'p-1.5 rounded-full transition-all',
              listening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50',
            )}
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestions instantanées */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-soft-lg overflow-hidden">
          {suggestions.slice(0, 6).map(s => (
            <button
              key={s.id}
              onMouseDown={(e) => { e.preventDefault(); s.onSelect(); setShowSuggestions(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50/60 dark:hover:bg-blue-900/15 transition-colors"
            >
              <span className="text-lg">{s.emoji || '🔎'}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{s.label}</span>
                {s.sublabel && <span className="block text-xs text-gray-400 truncate">{s.sublabel}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

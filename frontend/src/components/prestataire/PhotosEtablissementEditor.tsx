import { UploadCloud, X } from 'lucide-react';

interface Props {
  value: string[] | null;
  onChange: (value: string[]) => void;
  onPreviewChange?: (value: string | null) => void;
}

export default function PhotosEtablissementEditor({ value, onChange, onPreviewChange }: Props) {
  const photos = value || [];

  const handleAddPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newPhotos = [...photos, base64];
        onChange(newPhotos);
        if (newPhotos.length === 1 && onPreviewChange) onPreviewChange(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onChange(newPhotos);
    if (index === 0 && onPreviewChange) {
      onPreviewChange(newPhotos[0] || null);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {photos.map((photo, index) => (
          <div key={index} className="relative group">
            <img src={photo} alt={`Établissement ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
            <button
              onClick={() => handleRemovePhoto(index)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <label className="w-full flex items-center justify-center px-4 py-6 bg-gray-50 dark:bg-gray-700 text-blue-600 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
        <UploadCloud className="w-6 h-6 mr-2" />
        <span className="text-sm font-medium">Ajouter une photo</span>
        <input type="file" accept="image/*" onChange={handleAddPhoto} className="hidden" />
      </label>
    </div>
  );
}

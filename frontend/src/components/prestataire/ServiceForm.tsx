import { useEffect, useMemo, useState } from 'react';
import { X, MapPin, Clock, DollarSign, Tag, Image as ImageIcon, Layers, Grid3X3 } from 'lucide-react';
import { api, ApiCategory, ApiSubCategory } from '../../lib/api';

interface ServiceFormProps {
  service?: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function ServiceForm({ service, onClose, onSubmit }: ServiceFormProps) {
  const [formData, setFormData] = useState({
    nom: service?.nom || '',
    description: service?.description || '',
    prix: service?.prix || '',
    duree_minutes: service?.duree_minutes || 60,
    sous_categorie_id: service?.sous_categorie_id || '',
    is_domicile: service?.is_domicile || false,
    is_active: service?.is_active !== undefined ? service.is_active : true,
    photos: service?.photos || [],
    devise: service?.devise || 'FCFA'
  });

  const [errors, setErrors] = useState<any>({});
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [subCategories, setSubCategories] = useState<ApiSubCategory[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>('');

  useEffect(() => {
    const loadTaxonomy = async () => {
      try {
        setCategoryLoading(true);
        const [cats, subs] = await Promise.all([
          api.getCategories(),
          api.getSubCategories()
        ]);
        setCategories(cats);
        setSubCategories(subs);
      } catch (err) {
        console.error('Erreur chargement catégories:', err);
      } finally {
        setCategoryLoading(false);
      }
    };
    loadTaxonomy();
  }, []);

  useEffect(() => {
    if (!formData.sous_categorie_id) return;
    const found = subCategories.find(sc => sc.id === Number(formData.sous_categorie_id));
    if (found) {
      setSelectedCategoryId(found.categorie_id);
    }
  }, [formData.sous_categorie_id, subCategories]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });

    // Clear error when user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const filteredSubCategories = useMemo(() => {
    if (!selectedCategoryId) return subCategories;
    return subCategories.filter(sc => sc.categorie_id === Number(selectedCategoryId));
  }, [selectedCategoryId, subCategories]);

  const validate = () => {
    const newErrors: any = {};

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom du service est requis';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    }
    if (!formData.prix || parseFloat(formData.prix) <= 0) {
      newErrors.prix = 'Le prix doit être supérieur à 0';
    }
    if (!formData.duree_minutes || parseInt(formData.duree_minutes.toString()) <= 0) {
      newErrors.duree_minutes = 'La durée doit être supérieure à 0';
    }
    if (!selectedCategoryId) {
      newErrors.category = 'Choisissez une catégorie';
    }
    if (!formData.sous_categorie_id) {
      newErrors.sous_categorie_id = 'La sous-catégorie est requise';
    } else {
      const subExists = subCategories.some(sc => sc.id === Number(formData.sous_categorie_id));
      if (!subExists) {
        newErrors.sous_categorie_id = 'Sous-catégorie invalide';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      onSubmit({
        ...formData,
        sous_categorie_id: parseInt(formData.sous_categorie_id),
        prix: parseFloat(formData.prix),
        duree_minutes: parseInt(formData.duree_minutes.toString()),
        devise: formData.devise || 'FCFA'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {service ? 'Modifier le service' : 'Nouveau service'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Remplissez les informations de votre service
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Nom du service */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom du service *
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                className={`w-full pl-11 pr-4 py-3 border ${errors.nom ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all`}
                placeholder="Ex: Coupe + Brushing"
              />
            </div>
            {errors.nom && <p className="text-red-500 text-xs mt-1">{errors.nom}</p>}
          </div>

          {/* Catégorie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                Catégorie *
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : '';
                  setSelectedCategoryId(value);
                  setFormData(prev => ({ ...prev, sous_categorie_id: '' }));
                  if (errors.category) setErrors(prev => ({ ...prev, category: '' }));
                }}
                className={`w-full px-4 py-3 border ${errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all`}
                disabled={categoryLoading}
              >
                <option value="">Sélectionnez une catégorie</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nom}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 text-indigo-500" />
                Sous-catégorie *
              </label>
              <select
                name="sous_categorie_id"
                value={formData.sous_categorie_id}
                onChange={handleChange}
                className={`w-full px-4 py-3 border ${errors.sous_categorie_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all`}
                disabled={categoryLoading || !selectedCategoryId}
              >
                <option value="">Sélectionnez une sous-catégorie</option>
                {filteredSubCategories.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.nom}
                  </option>
                ))}
              </select>
              {errors.sous_categorie_id && <p className="text-red-500 text-xs mt-1">{errors.sous_categorie_id}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className={`w-full px-4 py-3 border ${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all resize-none`}
              placeholder="Décrivez votre service en détail..."
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Prix et Durée */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prix (FCFA) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  name="prix"
                  value={formData.prix}
                  onChange={handleChange}
                  min="0"
                  step="100"
                  className={`w-full pl-11 pr-4 py-3 border ${errors.prix ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all`}
                  placeholder="5000"
                />
              </div>
              {errors.prix && <p className="text-red-500 text-xs mt-1">{errors.prix}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Durée (minutes) *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  name="duree_minutes"
                  value={formData.duree_minutes}
                  onChange={handleChange}
                  min="5"
                  step="5"
                  className={`w-full pl-11 pr-4 py-3 border ${errors.duree_minutes ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all`}
                  placeholder="60"
                />
              </div>
              {errors.duree_minutes && <p className="text-red-500 text-xs mt-1">{errors.duree_minutes}</p>}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
              <input
                type="checkbox"
                id="is_domicile"
                name="is_domicile"
                checked={formData.is_domicile}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="is_domicile" className="flex items-center space-x-2 cursor-pointer">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Service à domicile</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Je peux me déplacer chez le client</p>
                </div>
              </label>
            </div>

            <div className="flex items-center space-x-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
              />
              <label htmlFor="is_active" className="cursor-pointer">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Service actif</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Les clients peuvent réserver ce service</p>
              </label>
            </div>
          </div>

          {/* Upload Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Photos du service (optionnel)
            </label>
            <div className="space-y-4">
              {/* Preview Grid */}
              {formData.photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img src={photo} alt={`Aperçu ${index + 1}`} className="w-full h-full object-cover rounded-xl" />
                      <button
                        type="button"
                        onClick={() => {
                          const newPhotos = formData.photos.filter((_, i) => i !== index);
                          setFormData({ ...formData, photos: newPhotos });
                        }}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              <label className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-700/50">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Cliquez pour ajouter des photos
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  PNG, JPG jusqu'à 5MB
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/png, image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      const files = Array.from(e.target.files);
                      files.forEach(file => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData(prev => ({ ...prev, photos: [...prev.photos, reader.result as string] }));
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-4 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-all"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            {service ? 'Enregistrer' : 'Créer le service'}
          </button>
        </div>
      </div>
    </div>
  );
}

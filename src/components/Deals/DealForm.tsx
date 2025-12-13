import { useState, useEffect } from 'react';
import { X, AlertCircle, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DealFormProps {
  deal?: any;
  onClose: () => void;
}

export function DealForm({ deal, onClose }: DealFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    property_type: 'single-family',
    deal_type: 'wholesale',
    status: 'lead',
    arv: '',
    ask_price: '',
    estimated_profit: '',
    repair_estimate: '',
    rental_potential: '',
    zoning: '',
    notes: '',
    image_url: '',
  });

  useEffect(() => {
    if (deal) {
      setFormData({
        title: deal.title || '',
        location: deal.location || '',
        property_type: deal.property_type || 'single-family',
        deal_type: deal.deal_type || 'wholesale',
        status: deal.status || 'lead',
        arv: deal.arv?.toString() || '',
        ask_price: deal.ask_price?.toString() || '',
        estimated_profit: deal.estimated_profit?.toString() || '',
        repair_estimate: deal.repair_estimate?.toString() || '',
        rental_potential: deal.rental_potential?.toString() || '',
        zoning: deal.zoning || '',
        notes: deal.notes || '',
        image_url: deal.image_url || '',
      });

      loadExistingImages(deal.id);
    }
  }, [deal]);

  const loadExistingImages = async (dealId: string) => {
    const { data, error } = await supabase
      .from('property_images')
      .select('*')
      .eq('deal_id', dealId)
      .order('display_order', { ascending: true });

    if (!error && data) {
      setExistingImages(data);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError('Please select only image files');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Each image must be less than 5MB');
        return;
      }

      validFiles.push(file);
    }

    setImageFiles([...imageFiles, ...validFiles]);
    setError('');

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeNewImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (imageId: string) => {
    const { error } = await supabase
      .from('property_images')
      .delete()
      .eq('id', imageId);

    if (!error) {
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
    }
  };

  const uploadImages = async (dealId: string): Promise<void> => {
    if (imageFiles.length === 0 || !user) return;

    setUploading(true);

    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${dealId}/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(fileName);

        await supabase
          .from('property_images')
          .insert({
            deal_id: dealId,
            image_url: publicUrl,
            display_order: existingImages.length + i
          });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      if (deal) {
        const dealData = {
          user_id: user.id,
          title: formData.title,
          location: formData.location,
          property_type: formData.property_type,
          deal_type: formData.deal_type,
          status: formData.status,
          arv: parseFloat(formData.arv) || 0,
          ask_price: parseFloat(formData.ask_price) || 0,
          estimated_profit: parseFloat(formData.estimated_profit) || 0,
          repair_estimate: parseFloat(formData.repair_estimate) || 0,
          rental_potential: parseFloat(formData.rental_potential) || 0,
          zoning: formData.zoning || null,
          notes: formData.notes,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('deals')
          .update(dealData)
          .eq('id', deal.id);

        if (error) throw error;

        await uploadImages(deal.id);
        onClose();
      } else {
        const dealData = {
          user_id: user.id,
          title: formData.title,
          location: formData.location,
          property_type: formData.property_type,
          deal_type: formData.deal_type,
          status: formData.status,
          arv: parseFloat(formData.arv) || 0,
          ask_price: parseFloat(formData.ask_price) || 0,
          estimated_profit: parseFloat(formData.estimated_profit) || 0,
          repair_estimate: parseFloat(formData.repair_estimate) || 0,
          rental_potential: parseFloat(formData.rental_potential) || 0,
          zoning: formData.zoning || null,
          notes: formData.notes,
          image_url: null,
          updated_at: new Date().toISOString(),
        };

        const { data: newDeal, error: insertError } = await supabase
          .from('deals')
          .insert([dealData])
          .select()
          .single();

        if (insertError) throw insertError;

        if (newDeal) {
          await uploadImages(newDeal.id);
        }

        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {deal ? 'Edit Deal' : 'Add New Deal'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Property Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="3-Bed Single Family Home"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Location *</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="Atlanta, GA"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Property Type</label>
              <select
                value={formData.property_type}
                onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              >
                <option value="single-family">Single Family</option>
                <option value="multi-family">Multi Family</option>
                <option value="condo">Condo</option>
                <option value="townhouse">Townhouse</option>
                <option value="land">Land</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Deal Type</label>
              <select
                value={formData.deal_type}
                onChange={(e) => setFormData({ ...formData, deal_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              >
                <option value="wholesale">Wholesale</option>
                <option value="investment">Investment</option>
                <option value="flip">Flip</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              >
                <option value="lead">Lead</option>
                <option value="analyzing">Analyzing</option>
                <option value="under-contract">Under Contract</option>
                <option value="closed">Closed</option>
                <option value="dead">Dead</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">ARV ($)</label>
              <input
                type="number"
                value={formData.arv}
                onChange={(e) => setFormData({ ...formData, arv: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="285000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Ask Price ($)</label>
              <input
                type="number"
                value={formData.ask_price}
                onChange={(e) => setFormData({ ...formData, ask_price: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="195000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Repair Estimate ($)</label>
              <input
                type="number"
                value={formData.repair_estimate}
                onChange={(e) => setFormData({ ...formData, repair_estimate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="45000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Estimated Profit ($)</label>
              <input
                type="number"
                value={formData.estimated_profit}
                onChange={(e) => setFormData({ ...formData, estimated_profit: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="45000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Rental Potential ($/month)</label>
              <input
                type="number"
                value={formData.rental_potential}
                onChange={(e) => setFormData({ ...formData, rental_potential: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="2500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Zoning</label>
              <input
                type="text"
                value={formData.zoning}
                onChange={(e) => setFormData({ ...formData, zoning: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="Residential R-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Property Images</label>
            <div className="space-y-4">
              {(existingImages.length > 0 || imagePreviews.length > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {existingImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <div className="relative h-40 rounded-lg overflow-hidden border border-gray-300">
                        <img
                          src={img.image_url}
                          alt="Property"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExistingImage(img.id)}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {imagePreviews.map((preview, index) => (
                    <div key={`new-${index}`} className="relative group">
                      <div className="relative h-40 rounded-lg overflow-hidden border border-gray-300">
                        <img
                          src={preview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="cursor-pointer">
                <div className="flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                  <Upload className="h-6 w-6 text-gray-400 mr-3" />
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 block">
                      Click to upload images
                    </span>
                    <span className="text-xs text-gray-500">
                      {imageFiles.length > 0 ? `${imageFiles.length} file(s) selected` : 'Select multiple images'}
                    </span>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500">Supported formats: JPG, PNG, GIF (max 5MB each)</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="Additional details about the property..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading image...' : loading ? 'Saving...' : (deal ? 'Update Deal' : 'Create Deal')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

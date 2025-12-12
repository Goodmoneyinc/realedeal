import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DealFormProps {
  deal?: any;
  onClose: () => void;
}

export function DealForm({ deal, onClose }: DealFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    }
  }, [deal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

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
      image_url: formData.image_url || null,
      updated_at: new Date().toISOString(),
    };

    if (deal) {
      const { error } = await supabase
        .from('deals')
        .update(dealData)
        .eq('id', deal.id);

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        onClose();
      }
    } else {
      const { error } = await supabase
        .from('deals')
        .insert([dealData]);

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        onClose();
      }
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

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Image URL</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="https://..."
              />
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
              disabled={loading}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (deal ? 'Update Deal' : 'Create Deal')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

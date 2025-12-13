import { useState, useEffect } from 'react';
import { X, MapPin, DollarSign, Calendar, Building, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface NewTransactionModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Deal {
  id: string;
  title: string;
  location: string;
  ask_price: number;
}

export function NewTransactionModal({ onClose, onSuccess }: NewTransactionModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [formData, setFormData] = useState({
    deal_id: '',
    property_address: '',
    transaction_type: 'purchase',
    purchase_price: '',
    estimated_close_date: '',
    state: 'CA',
    brokerage: ''
  });

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    const { data } = await supabase
      .from('deals')
      .select('id, title, location, ask_price')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (data) {
      setDeals(data);
    }
  };

  const handleDealSelect = (dealId: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (deal) {
      setFormData({
        ...formData,
        deal_id: dealId,
        property_address: deal.location,
        purchase_price: deal.ask_price.toString()
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: pipelineData, error: pipelineError } = await supabase
      .from('transaction_pipeline')
      .insert({
        deal_id: formData.deal_id || null,
        agent_id: user?.id,
        property_address: formData.property_address,
        transaction_type: formData.transaction_type,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        estimated_close_date: formData.estimated_close_date || null,
        state: formData.state,
        brokerage: formData.brokerage || null,
        current_stage: 'listing',
        status: 'active'
      })
      .select()
      .single();

    if (!pipelineError && pipelineData) {
      const { data: complianceRules } = await supabase
        .from('compliance_checklists')
        .select('*')
        .eq('state', formData.state)
        .eq('stage', 'listing');

      if (complianceRules && complianceRules.length > 0) {
        await Promise.all(
          complianceRules.map(rule =>
            supabase
              .from('pipeline_checklist_items')
              .insert({
                pipeline_id: pipelineData.id,
                compliance_checklist_id: rule.id,
                title: rule.checklist_name,
                description: rule.description,
                stage: 'listing',
                priority: rule.is_required ? 'high' : 'medium'
              })
          )
        );
      }

      onSuccess();
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">New Transaction</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Link to Deal (Optional)
            </label>
            <select
              value={formData.deal_id}
              onChange={(e) => handleDealSelect(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            >
              <option value="">Select a deal or enter manually</option>
              {deals.map(deal => (
                <option key={deal.id} value={deal.id}>
                  {deal.title} - {deal.location}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Property Address *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                required
                value={formData.property_address}
                onChange={(e) => setFormData({ ...formData, property_address: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="123 Main St, City, State"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Transaction Type
              </label>
              <select
                value={formData.transaction_type}
                onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              >
                <option value="purchase">Purchase</option>
                <option value="sale">Sale</option>
                <option value="refinance">Refinance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                State *
              </label>
              <select
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              >
                <option value="CA">California</option>
                <option value="TX">Texas</option>
                <option value="FL">Florida</option>
                <option value="NY">New York</option>
                <option value="AZ">Arizona</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Purchase Price
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Estimated Close Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={formData.estimated_close_date}
                  onChange={(e) => setFormData({ ...formData, estimated_close_date: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Brokerage
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={formData.brokerage}
                onChange={(e) => setFormData({ ...formData, brokerage: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="Your Brokerage Name"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

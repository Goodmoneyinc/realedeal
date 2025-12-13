import { useState, useEffect } from 'react';
import { Home, Building2, X, AlertCircle, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Deal {
  id: string;
  title: string;
  location: string;
  property_type: string;
  arv: number;
  ask_price: number;
  repair_estimate: number;
  rental_potential: number;
  zoning?: string;
  image_url?: string;
  notes?: string;
  estimated_profit: number;
  user_id: string;
}

interface DealAction {
  action_type: string;
  decline_reason?: string;
}

interface Lender {
  id: string;
  full_name: string;
  company_name?: string;
}

export function InvestorDealsPage() {
  const { user, profile } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dealActions, setDealActions] = useState<Record<string, DealAction>>({});
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionType, setActionType] = useState<'interested' | 'declined' | 'lender' | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [selectedLender, setSelectedLender] = useState('');
  const [earnestMoney, setEarnestMoney] = useState('');

  useEffect(() => {
    if (profile?.role === 'investor') {
      loadDeals();
      loadLenders();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const loadDeals = async () => {
    if (!user) return;

    const { data: assignments } = await supabase
      .from('agent_investor_assignments')
      .select('agent_id')
      .eq('investor_id', user.id);

    if (!assignments || assignments.length === 0) {
      setLoading(false);
      return;
    }

    const agentIds = assignments.map(a => a.agent_id);

    const { data: dealsData, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .in('user_id', agentIds)
      .eq('status', 'under-contract')
      .order('created_at', { ascending: false });

    const { data: actionsData } = await supabase
      .from('deal_actions')
      .select('deal_id, action_type, decline_reason')
      .eq('investor_id', user.id);

    if (dealsError) {
      setError(dealsError.message);
    } else {
      setDeals(dealsData || []);
      const actionsMap: Record<string, DealAction> = {};
      actionsData?.forEach(action => {
        actionsMap[action.deal_id] = {
          action_type: action.action_type,
          decline_reason: action.decline_reason,
        };
      });
      setDealActions(actionsMap);
    }
    setLoading(false);
  };

  const loadLenders = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, company_name')
      .eq('role', 'lender')
      .order('full_name');

    if (data) {
      setLenders(data);
    }
  };

  const handleDealAction = async (deal: Deal, type: 'interested' | 'declined') => {
    setSelectedDeal(deal);
    setActionType(type);
  };

  const handleReferToLender = async (deal: Deal) => {
    setSelectedDeal(deal);
    setActionType('lender');
  };

  const submitAction = async () => {
    if (!user || !selectedDeal) return;

    if (actionType === 'interested') {
      const { error } = await supabase
        .from('deal_actions')
        .upsert([{
          deal_id: selectedDeal.id,
          investor_id: user.id,
          action_type: 'interested',
          earnest_money_amount: parseFloat(earnestMoney) || 0,
        }]);

      if (error) {
        setError(error.message);
      } else {
        setSelectedDeal(null);
        setActionType(null);
        setEarnestMoney('');
        loadDeals();
      }
    } else if (actionType === 'declined') {
      const { error } = await supabase
        .from('deal_actions')
        .upsert([{
          deal_id: selectedDeal.id,
          investor_id: user.id,
          action_type: 'declined',
          decline_reason: declineReason,
        }]);

      if (error) {
        setError(error.message);
      } else {
        setSelectedDeal(null);
        setActionType(null);
        setDeclineReason('');
        loadDeals();
      }
    } else if (actionType === 'lender' && selectedLender) {
      const { error } = await supabase
        .from('lender_referrals')
        .insert([{
          deal_id: selectedDeal.id,
          investor_id: user.id,
          lender_id: selectedLender,
        }]);

      if (error) {
        setError(error.message);
      } else {
        setSelectedDeal(null);
        setActionType(null);
        setSelectedLender('');
        alert('Deal successfully referred to lender!');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading deals...</div>
      </div>
    );
  }

  if (profile?.role !== 'investor') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">This feature is only available to investors.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Available Deals</h1>
        <p className="text-gray-600 mt-2">Review wholesale properties from your assigned agents</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-red-800 text-sm">{error}</span>
        </div>
      )}

      {deals.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No deals available</h3>
          <p className="text-gray-600">Check back later for new opportunities</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deals.map((deal) => {
            const action = dealActions[deal.id];
            return (
              <div
                key={deal.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
              >
                {deal.image_url && (
                  <img
                    src={deal.image_url}
                    alt={deal.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{deal.title}</h3>
                  <p className="text-gray-600 mb-4 flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {deal.location}
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Ask Price:</span>
                      <span className="font-semibold text-gray-900">${deal.ask_price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">ARV:</span>
                      <span className="font-semibold text-emerald-600">${deal.arv.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Repair Est:</span>
                      <span className="font-semibold text-gray-900">${deal.repair_estimate.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Rental Potential:</span>
                      <span className="font-semibold text-gray-900">${deal.rental_potential.toLocaleString()}/mo</span>
                    </div>
                    {deal.zoning && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Zoning:</span>
                        <span className="font-semibold text-gray-900">{deal.zoning}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Est. Profit:</span>
                      <span className="font-bold text-emerald-600 text-lg">${deal.estimated_profit.toLocaleString()}</span>
                    </div>
                  </div>

                  {action ? (
                    <div className={`p-3 rounded-lg text-center font-semibold ${
                      action.action_type === 'interested'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {action.action_type === 'interested' ? 'Interested' : 'Declined'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleDealAction(deal, 'interested')}
                        className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
                      >
                        I'm Interested
                      </button>
                      <button
                        onClick={() => handleDealAction(deal, 'declined')}
                        className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Not Interested
                      </button>
                      <button
                        onClick={() => handleReferToLender(deal)}
                        className="w-full px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        Refer to Lender
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedDeal && actionType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {actionType === 'interested' && 'Express Interest'}
                {actionType === 'declined' && 'Decline Deal'}
                {actionType === 'lender' && 'Refer to Lender'}
              </h2>
              <button
                onClick={() => {
                  setSelectedDeal(null);
                  setActionType(null);
                  setDeclineReason('');
                  setSelectedLender('');
                  setEarnestMoney('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">{selectedDeal.title}</h3>

              {actionType === 'interested' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Earnest Money Amount (Optional)
                  </label>
                  <input
                    type="number"
                    value={earnestMoney}
                    onChange={(e) => setEarnestMoney(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="10000"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Enter the amount you're willing to deposit as earnest money
                  </p>
                </div>
              )}

              {actionType === 'declined' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Reason for Declining (Optional)
                  </label>
                  <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="Price too high, location not ideal, etc..."
                  />
                </div>
              )}

              {actionType === 'lender' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Select Lender
                  </label>
                  <select
                    value={selectedLender}
                    onChange={(e) => setSelectedLender(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Choose a lender...</option>
                    {lenders.map((lender) => (
                      <option key={lender.id} value={lender.id}>
                        {lender.full_name} {lender.company_name && `(${lender.company_name})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => {
                    setSelectedDeal(null);
                    setActionType(null);
                    setDeclineReason('');
                    setSelectedLender('');
                    setEarnestMoney('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAction}
                  disabled={actionType === 'lender' && !selectedLender}
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

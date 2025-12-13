import { useState, useEffect } from 'react';
import { DollarSign, Send, Plus, X, FileText, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Deal {
  id: string;
  title: string;
  location: string;
  property_type: string;
  arv: number;
  ask_price: number;
  estimated_profit: number;
  repair_estimate: number;
  status: string;
  created_at: string;
}

interface FinancingProposal {
  id: string;
  deal_id: string;
  loan_amount: number;
  interest_rate: number;
  loan_term_months: number;
  down_payment_required: number;
  closing_costs: number;
  loan_type: string;
  notes: string;
  status: string;
  created_at: string;
  expires_at: string | null;
}

export function FinancingToolPage() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [proposals, setProposals] = useState<FinancingProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [formData, setFormData] = useState({
    loan_amount: '',
    interest_rate: '',
    loan_term_months: '360',
    down_payment_required: '',
    closing_costs: '',
    loan_type: 'conventional',
    notes: '',
    expires_at: ''
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [dealsResponse, proposalsResponse] = await Promise.all([
        supabase.from('deals').select('*').order('created_at', { ascending: false }),
        supabase.from('financing_proposals').select('*').eq('lender_id', user.id).order('created_at', { ascending: false })
      ]);

      if (dealsResponse.data) setDeals(dealsResponse.data);
      if (proposalsResponse.data) setProposals(proposalsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDeal) return;

    try {
      const { error } = await supabase.from('financing_proposals').insert({
        deal_id: selectedDeal.id,
        lender_id: user.id,
        loan_amount: parseFloat(formData.loan_amount),
        interest_rate: parseFloat(formData.interest_rate),
        loan_term_months: parseInt(formData.loan_term_months),
        down_payment_required: parseFloat(formData.down_payment_required) || 0,
        closing_costs: parseFloat(formData.closing_costs) || 0,
        loan_type: formData.loan_type,
        notes: formData.notes,
        status: 'sent',
        expires_at: formData.expires_at || null
      });

      if (error) throw error;

      setShowProposalForm(false);
      setSelectedDeal(null);
      setFormData({
        loan_amount: '',
        interest_rate: '',
        loan_term_months: '360',
        down_payment_required: '',
        closing_costs: '',
        loan_type: 'conventional',
        notes: '',
        expires_at: ''
      });
      loadData();
    } catch (error) {
      console.error('Error submitting proposal:', error);
    }
  };

  const getDealProposals = (dealId: string) => {
    return proposals.filter(p => p.deal_id === dealId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'accepted': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'expired': return 'bg-gray-100 text-gray-700';
      case 'draft': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const calculateMonthlyPayment = () => {
    const principal = parseFloat(formData.loan_amount) || 0;
    const rate = (parseFloat(formData.interest_rate) || 0) / 100 / 12;
    const months = parseInt(formData.loan_term_months) || 360;

    if (principal === 0 || rate === 0) return 0;

    const payment = principal * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
    return payment;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financing Tool</h1>
          <p className="text-gray-600 mt-1">Review property deals and send financing options</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-white rounded-lg shadow px-6 py-3">
            <div className="text-sm text-gray-600">Total Proposals Sent</div>
            <div className="text-2xl font-bold text-gray-900">{proposals.filter(p => p.status === 'sent').length}</div>
          </div>
          <div className="bg-white rounded-lg shadow px-6 py-3">
            <div className="text-sm text-gray-600">Accepted</div>
            <div className="text-2xl font-bold text-green-600">{proposals.filter(p => p.status === 'accepted').length}</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Available Deals</h2>

          {deals.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No deals available at the moment</p>
            </div>
          ) : (
            deals.map(deal => {
              const dealProposals = getDealProposals(deal.id);
              const hasProposal = dealProposals.length > 0;

              return (
                <div key={deal.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{deal.title}</h3>
                        <p className="text-sm text-gray-600">{deal.location}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                        {deal.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Ask Price</p>
                        <p className="text-lg font-semibold text-gray-900">
                          ${deal.ask_price.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">ARV</p>
                        <p className="text-lg font-semibold text-gray-900">
                          ${deal.arv.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Repairs</p>
                        <p className="text-lg font-semibold text-gray-900">
                          ${deal.repair_estimate.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Property Type</p>
                        <p className="text-lg font-semibold text-gray-900 capitalize">
                          {deal.property_type.replace('-', ' ')}
                        </p>
                      </div>
                    </div>

                    {hasProposal && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800 font-medium mb-2">Your Proposals:</p>
                        {dealProposals.map(proposal => (
                          <div key={proposal.id} className="flex items-center justify-between text-sm mb-1">
                            <span className="text-blue-700">
                              ${proposal.loan_amount.toLocaleString()} @ {proposal.interest_rate}%
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(proposal.status)}`}>
                              {proposal.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setSelectedDeal(deal);
                        setShowProposalForm(true);
                        setFormData(prev => ({
                          ...prev,
                          loan_amount: (deal.ask_price + deal.repair_estimate).toString(),
                          down_payment_required: (deal.ask_price * 0.2).toString()
                        }));
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create Financing Proposal</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Proposals</h2>

          {proposals.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No proposals yet</p>
              <p className="text-sm text-gray-500 mt-1">Create your first financing proposal to get started</p>
            </div>
          ) : (
            proposals.map(proposal => {
              const deal = deals.find(d => d.id === proposal.deal_id);
              const monthlyPayment = (proposal.loan_amount * (proposal.interest_rate / 100 / 12) *
                Math.pow(1 + proposal.interest_rate / 100 / 12, proposal.loan_term_months)) /
                (Math.pow(1 + proposal.interest_rate / 100 / 12, proposal.loan_term_months) - 1);

              return (
                <div key={proposal.id} className="bg-white rounded-lg shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {deal?.title || 'Unknown Deal'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(proposal.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(proposal.status)}`}>
                        {proposal.status}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Loan Amount</span>
                        <span className="font-semibold text-gray-900">
                          ${proposal.loan_amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Interest Rate</span>
                        <span className="font-semibold text-gray-900">{proposal.interest_rate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Term</span>
                        <span className="font-semibold text-gray-900">
                          {proposal.loan_term_months} months
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Monthly Payment</span>
                        <span className="font-semibold text-gray-900">
                          ${Math.round(monthlyPayment).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Loan Type</span>
                        <span className="font-semibold text-gray-900 capitalize">
                          {proposal.loan_type.replace('-', ' ')}
                        </span>
                      </div>
                    </div>

                    {proposal.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-700">{proposal.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showProposalForm && selectedDeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Create Financing Proposal</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedDeal.title}</p>
              </div>
              <button
                onClick={() => {
                  setShowProposalForm(false);
                  setSelectedDeal(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitProposal} className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loan Amount *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      required
                      value={formData.loan_amount}
                      onChange={e => setFormData({ ...formData, loan_amount: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interest Rate (%) *
                  </label>
                  <div className="relative">
                    <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.interest_rate}
                      onChange={e => setFormData({ ...formData, interest_rate: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loan Term (months) *
                  </label>
                  <select
                    value={formData.loan_term_months}
                    onChange={e => setFormData({ ...formData, loan_term_months: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="60">5 years (60 months)</option>
                    <option value="120">10 years (120 months)</option>
                    <option value="180">15 years (180 months)</option>
                    <option value="240">20 years (240 months)</option>
                    <option value="360">30 years (360 months)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loan Type *
                  </label>
                  <select
                    value={formData.loan_type}
                    onChange={e => setFormData({ ...formData, loan_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="conventional">Conventional</option>
                    <option value="hard-money">Hard Money</option>
                    <option value="bridge">Bridge Loan</option>
                    <option value="commercial">Commercial</option>
                    <option value="portfolio">Portfolio</option>
                    <option value="sba">SBA</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Down Payment Required
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.down_payment_required}
                      onChange={e => setFormData({ ...formData, down_payment_required: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Closing Costs
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.closing_costs}
                      onChange={e => setFormData({ ...formData, closing_costs: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expires At
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="datetime-local"
                      value={formData.expires_at}
                      onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {formData.loan_amount && formData.interest_rate && (
                <div className="bg-emerald-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-900">Estimated Monthly Payment:</span>
                    <span className="text-2xl font-bold text-emerald-700">
                      ${Math.round(calculateMonthlyPayment()).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Add any special terms, conditions, or notes..."
                />
              </div>

              <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowProposalForm(false);
                    setSelectedDeal(null);
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  <span>Send Proposal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

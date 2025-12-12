import { useState, useEffect } from 'react';
import { FileText, DollarSign, TrendingUp, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Referral {
  id: string;
  deal_id: string;
  investor_id: string;
  status: string;
  created_at: string;
  deal: {
    title: string;
    location: string;
    arv: number;
    ask_price: number;
    repair_estimate: number;
    rental_potential: number;
    image_url?: string;
  };
  investor: {
    full_name: string;
    company_name?: string;
  };
}

interface TermSheet {
  loan_amount: string;
  interest_rate: string;
  loan_term_months: string;
  down_payment_required: string;
  closing_costs: string;
  monthly_payment: string;
  terms_details: string;
}

export function LenderReferralsPage() {
  const { user, profile } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [showTermSheetForm, setShowTermSheetForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [termSheet, setTermSheet] = useState<TermSheet>({
    loan_amount: '',
    interest_rate: '',
    loan_term_months: '360',
    down_payment_required: '',
    closing_costs: '',
    monthly_payment: '',
    terms_details: '',
  });

  useEffect(() => {
    if (profile?.role === 'lender') {
      loadReferrals();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const loadReferrals = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('lender_referrals')
      .select(`
        id,
        deal_id,
        investor_id,
        status,
        created_at,
        deal:deals(title, location, arv, ask_price, repair_estimate, rental_potential, image_url),
        investor:user_profiles!investor_id(full_name, company_name)
      `)
      .eq('lender_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setReferrals(data || []);
    }
    setLoading(false);
  };

  const handleCreateTermSheet = (referral: Referral) => {
    setSelectedReferral(referral);
    setShowTermSheetForm(true);
    setTermSheet({
      loan_amount: referral.deal.ask_price.toString(),
      interest_rate: '7.5',
      loan_term_months: '360',
      down_payment_required: Math.round(referral.deal.ask_price * 0.2).toString(),
      closing_costs: Math.round(referral.deal.ask_price * 0.03).toString(),
      monthly_payment: '',
      terms_details: '',
    });
  };

  const calculateMonthlyPayment = () => {
    const principal = parseFloat(termSheet.loan_amount) - parseFloat(termSheet.down_payment_required || '0');
    const monthlyRate = parseFloat(termSheet.interest_rate) / 100 / 12;
    const numPayments = parseInt(termSheet.loan_term_months);

    if (principal > 0 && monthlyRate > 0 && numPayments > 0) {
      const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                     (Math.pow(1 + monthlyRate, numPayments) - 1);
      setTermSheet({ ...termSheet, monthly_payment: payment.toFixed(2) });
    }
  };

  const submitTermSheet = async () => {
    if (!user || !selectedReferral) return;

    const { error: termSheetError } = await supabase
      .from('term_sheets')
      .insert([{
        referral_id: selectedReferral.id,
        lender_id: user.id,
        loan_amount: parseFloat(termSheet.loan_amount),
        interest_rate: parseFloat(termSheet.interest_rate),
        loan_term_months: parseInt(termSheet.loan_term_months),
        down_payment_required: parseFloat(termSheet.down_payment_required) || 0,
        closing_costs: parseFloat(termSheet.closing_costs) || 0,
        monthly_payment: parseFloat(termSheet.monthly_payment),
        terms_details: termSheet.terms_details,
      }]);

    if (termSheetError) {
      setError(termSheetError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from('lender_referrals')
      .update({ status: 'term_sheet_generated' })
      .eq('id', selectedReferral.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setShowTermSheetForm(false);
      setSelectedReferral(null);
      loadReferrals();
      alert('Term sheet created successfully!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading referrals...</div>
      </div>
    );
  }

  if (profile?.role !== 'lender') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">This feature is only available to lenders.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Deal Referrals</h1>
        <p className="text-gray-600 mt-2">Review properties and generate term sheets</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-red-800 text-sm">{error}</span>
        </div>
      )}

      {referrals.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No referrals yet</h3>
          <p className="text-gray-600">Deal referrals from investors will appear here</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {referrals.map((referral) => (
            <div
              key={referral.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
            >
              {referral.deal.image_url && (
                <img
                  src={referral.deal.image_url}
                  alt={referral.deal.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
                  referral.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : referral.status === 'reviewed'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {referral.status.replace('_', ' ').toUpperCase()}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{referral.deal.title}</h3>
                <p className="text-gray-600 mb-1">{referral.deal.location}</p>
                <p className="text-sm text-gray-500 mb-4">
                  Referred by: {referral.investor.full_name}
                  {referral.investor.company_name && ` (${referral.investor.company_name})`}
                </p>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Ask Price:</span>
                    <span className="font-semibold text-gray-900">${referral.deal.ask_price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">ARV:</span>
                    <span className="font-semibold text-emerald-600">${referral.deal.arv.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Repair Est:</span>
                    <span className="font-semibold text-gray-900">${referral.deal.repair_estimate.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Rental Potential:</span>
                    <span className="font-semibold text-gray-900">${referral.deal.rental_potential.toLocaleString()}/mo</span>
                  </div>
                </div>

                {referral.status === 'term_sheet_generated' ? (
                  <div className="p-3 bg-green-50 text-green-700 rounded-lg text-center font-semibold">
                    Term Sheet Generated
                  </div>
                ) : (
                  <button
                    onClick={() => handleCreateTermSheet(referral)}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <FileText className="h-5 w-5" />
                    Generate Term Sheet
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showTermSheetForm && selectedReferral && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Generate Term Sheet</h2>
              <button
                onClick={() => {
                  setShowTermSheetForm(false);
                  setSelectedReferral(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-6">{selectedReferral.deal.title}</h3>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Loan Amount ($)</label>
                    <input
                      type="number"
                      value={termSheet.loan_amount}
                      onChange={(e) => setTermSheet({ ...termSheet, loan_amount: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Interest Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={termSheet.interest_rate}
                      onChange={(e) => setTermSheet({ ...termSheet, interest_rate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Loan Term (months)</label>
                    <select
                      value={termSheet.loan_term_months}
                      onChange={(e) => setTermSheet({ ...termSheet, loan_term_months: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="180">15 years (180 months)</option>
                      <option value="240">20 years (240 months)</option>
                      <option value="360">30 years (360 months)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Down Payment ($)</label>
                    <input
                      type="number"
                      value={termSheet.down_payment_required}
                      onChange={(e) => setTermSheet({ ...termSheet, down_payment_required: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Closing Costs ($)</label>
                    <input
                      type="number"
                      value={termSheet.closing_costs}
                      onChange={(e) => setTermSheet({ ...termSheet, closing_costs: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Monthly Payment ($)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={termSheet.monthly_payment}
                        onChange={(e) => setTermSheet({ ...termSheet, monthly_payment: e.target.value })}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={calculateMonthlyPayment}
                        className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-sm"
                      >
                        Calculate
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Additional Terms & Details</label>
                  <textarea
                    value={termSheet.terms_details}
                    onChange={(e) => setTermSheet({ ...termSheet, terms_details: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Include any special terms, conditions, or notes about this financing offer..."
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowTermSheetForm(false);
                    setSelectedReferral(null);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitTermSheet}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Generate Term Sheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

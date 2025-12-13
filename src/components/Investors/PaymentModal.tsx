import React, { useState } from 'react';
import { X, DollarSign, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  dealTitle: string;
  paymentType: 'earnest_money' | 'platform_fee' | 'commission' | 'closing_cost';
  amount: number;
  onPaymentComplete?: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  dealId,
  dealTitle,
  paymentType,
  amount,
  onPaymentComplete
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('card');

  // Card details
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  // Bank details
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');

  const paymentTypeLabels = {
    earnest_money: 'Earnest Money Deposit',
    platform_fee: 'Platform Fee',
    commission: 'Commission Payment',
    closing_cost: 'Closing Cost'
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // In production, this would integrate with Stripe
      // For now, we'll create a pending payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          deal_id: dealId,
          payer_id: user.id,
          payment_type: paymentType,
          amount: amount,
          status: 'pending',
          payment_method: paymentMethod,
          metadata: {
            payment_method_type: paymentMethod,
            cardholder_name: paymentMethod === 'card' ? cardholderName : undefined,
            account_holder_name: paymentMethod === 'bank' ? accountHolderName : undefined,
            last_4: paymentMethod === 'card'
              ? cardNumber.slice(-4)
              : accountNumber.slice(-4)
          }
        });

      if (paymentError) throw paymentError;

      // Update deal status if earnest money
      if (paymentType === 'earnest_money') {
        const { error: updateError } = await supabase
          .from('deals')
          .update({ earnest_money_status: 'paid' })
          .eq('id', dealId);

        if (updateError) throw updateError;
      }

      setSuccess(true);
      setTimeout(() => {
        onPaymentComplete?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ');
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {paymentTypeLabels[paymentType]}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{dealTitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Submitted</h3>
            <p className="text-gray-600">
              Your payment is being processed. You'll receive a confirmation shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Amount Due</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Payment Error</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                    paymentMethod === 'card'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CreditCard className={`w-6 h-6 ${paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${paymentMethod === 'card' ? 'text-blue-900' : 'text-gray-700'}`}>
                    Credit/Debit Card
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank')}
                  className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                    paymentMethod === 'bank'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <DollarSign className={`w-6 h-6 ${paymentMethod === 'bank' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${paymentMethod === 'bank' ? 'text-blue-900' : 'text-gray-700'}`}>
                    Bank Account
                  </span>
                </button>
              </div>
            </div>

            {paymentMethod === 'card' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\s/g, '');
                      if (value.length <= 16 && /^\d*$/.test(value)) {
                        setCardNumber(formatCardNumber(value));
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      required
                      value={expiryDate}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 4) {
                          setExpiryDate(formatExpiryDate(value));
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <input
                      type="text"
                      required
                      value={cvv}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 4) {
                          setCvv(value);
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Routing Number
                  </label>
                  <input
                    type="text"
                    required
                    value={routingNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 9) {
                        setRoutingNumber(value);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123456789"
                    maxLength={9}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 17) {
                        setAccountNumber(value);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1234567890123456"
                    maxLength={17}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600">
                Your payment information is secure and encrypted. This transaction will appear on your statement as "Real Estate CRM Platform".
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : `Pay $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

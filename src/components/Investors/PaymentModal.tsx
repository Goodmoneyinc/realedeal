import React, { useState, useEffect } from 'react';
import { X, DollarSign, CreditCard, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';

declare const Stripe: any;

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
  const [stripe, setStripe] = useState<any>(null);
  const [cardElement, setCardElement] = useState<any>(null);
  const [cardholderName, setCardholderName] = useState('');
  const [stripeConfigured, setStripeConfigured] = useState(false);

  const paymentTypeLabels = {
    earnest_money: 'Earnest Money Deposit',
    platform_fee: 'Platform Fee',
    commission: 'Commission Payment',
    closing_cost: 'Closing Cost'
  };

  useEffect(() => {
    if (isOpen && typeof Stripe !== 'undefined') {
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

      if (!publishableKey) {
        setStripeConfigured(false);
        return;
      }

      setStripeConfigured(true);
      const stripeInstance = Stripe(publishableKey);
      setStripe(stripeInstance);

      const elements = stripeInstance.elements();
      const card = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#1f2937',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            '::placeholder': {
              color: '#9ca3af',
            },
          },
          invalid: {
            color: '#ef4444',
          },
        },
      });

      setTimeout(() => {
        const cardContainer = document.getElementById('card-element');
        if (cardContainer) {
          card.mount('#card-element');
          setCardElement(card);
        }
      }, 100);

      return () => {
        if (card) {
          card.destroy();
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripeConfigured) {
      setError('Stripe is not configured. Please contact support or configure Stripe at https://bolt.new/setup/stripe');
      return;
    }

    if (!stripe || !cardElement) {
      setError('Payment system is not ready. Please try again.');
      return;
    }

    if (!cardholderName.trim()) {
      setError('Please enter the cardholder name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: methodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: cardholderName,
        },
      });

      if (methodError) {
        throw new Error(methodError.message);
      }

      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            dealId,
            amount,
            paymentType,
            paymentMethodId: paymentMethod.id,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Payment processing failed');
      }

      setSuccess(true);
      setTimeout(() => {
        onPaymentComplete?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const platformFee = amount * 0.005;
  const agentReceives = amount - platformFee;

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

        {!stripeConfigured ? (
          <div className="p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">Stripe Configuration Required</h3>
                  <p className="text-sm text-yellow-800 mb-4">
                    To accept payments, you need to configure Stripe with your secret key and publishable key.
                  </p>
                  <a
                    href="https://bolt.new/setup/stripe"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Configure Stripe
                  </a>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        ) : success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful</h3>
            <p className="text-gray-600">
              Your payment has been processed successfully. You'll receive a confirmation email shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Payment Amount</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t border-blue-200 pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Platform Fee (0.5%)</span>
                    <span>${platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Agent Receives</span>
                    <span className="font-semibold">${agentReceives.toFixed(2)}</span>
                  </div>
                </div>
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
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Information
                </label>
                <div
                  id="card-element"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white"
                />
              </div>
            </div>

            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">
                  Your payment is secure and encrypted. Funds are transferred directly to the agent minus the 0.5% platform fee. This transaction will appear on your statement.
                </p>
              </div>
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
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

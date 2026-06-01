interface StripeCheckoutParams {
  priceId: string;
  mode: 'payment' | 'subscription';
  successUrl: string;
  cancelUrl: string;
}

interface CheckoutSessionResponse {
  url?: string;
  error?: string;
}

export async function createStripeCheckout({
  priceId,
  mode,
  successUrl,
  cancelUrl,
}: StripeCheckoutParams): Promise<{ url: string | null; error: string | null }> {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return { url: null, error: 'Stripe publishable key is not configured' };
  }

  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Stripe-Publishable-Key': publishableKey,
      },
      body: JSON.stringify({
        priceId,
        mode,
        successUrl,
        cancelUrl,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as CheckoutSessionResponse;

    if (!response.ok) {
      return {
        url: null,
        error: data.error || `Failed to create checkout session (${response.status})`,
      };
    }

    if (!data.url) {
      return { url: null, error: 'Checkout session response did not include a URL' };
    }

    return { url: data.url, error: null };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return {
      url: null,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

# Stripe Product Integration for "Start Free Trial" Button

The "Start Free Trial" button is now connected to Stripe Checkout! Follow these steps to complete the setup.

## How It Works

1. User clicks "Start Free Trial" on the landing page
2. User creates an account (or signs in if they already have one)
3. User is automatically redirected to Stripe Checkout
4. After successful payment, user is redirected back to the dashboard
5. User can start using the platform

## Setup Steps

### 1. Get Your Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Sign up or sign in to your account
3. Navigate to **Developers** → **API Keys**
4. Copy your keys:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)

### 2. Create a Stripe Product

1. In Stripe Dashboard, go to **Products**
2. Click **Add Product**
3. Enter product details:
   - **Name**: e.g., "Monthly Subscription" or "Premium Plan"
   - **Description**: Optional description
   - **Pricing**:
     - Choose **Recurring** for subscriptions
     - Set your price (e.g., $29/month)
     - Select billing period (monthly/yearly)
4. Click **Save Product**
5. Copy the **Price ID** (starts with `price_`)

### 3. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Stripe API Keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# Stripe Product
VITE_STRIPE_PRICE_ID=price_your_subscription_price_id_here
```

**Important:**
- Use **test keys** (starting with `pk_test_` and `sk_test_`) for development
- Use **live keys** (starting with `pk_live_` and `sk_live_`) for production
- Never commit your secret key to version control

### 4. Test the Integration

#### Test Mode

Use these test card numbers in Stripe Checkout:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Any future expiration date and any 3-digit CVC will work.

#### Test the Flow

1. Click "Start Free Trial" on the landing page
2. Create a test account
3. You should be redirected to Stripe Checkout
4. Enter test card details
5. Complete the payment
6. You should be redirected back to your dashboard

### 5. Going Live

When ready for production:

1. Replace test keys with live keys in `.env`
2. Create a live product in Stripe Dashboard
3. Update `VITE_STRIPE_PRICE_ID` with the live price ID
4. Test with small real transactions first
5. Monitor your Stripe Dashboard for activity

## Features

### Automatic Customer Creation

- New users are automatically created as Stripe customers
- Customer data is synced with your database
- Email addresses are automatically linked

### Subscription Management

- Subscriptions are tracked in the `stripe_subscriptions` table
- Status updates are handled via Stripe webhooks
- Users can manage subscriptions from their profile

### Security

- Card details never touch your server
- PCI compliance handled by Stripe
- All payments encrypted in transit
- Automatic fraud detection

## Troubleshooting

### "CONFIGURE_STRIPE_PRICE_ID" Error

This means you haven't set the `VITE_STRIPE_PRICE_ID` environment variable. Add it to your `.env` file.

### Checkout Session Not Creating

1. Check that your Stripe secret key is configured correctly
2. Verify the price ID exists in your Stripe Dashboard
3. Check browser console for errors
4. Review Supabase edge function logs

### User Redirected But No Subscription

1. Check that webhooks are configured correctly
2. Verify the webhook endpoint is accessible
3. Review the `stripe_subscriptions` table for the customer
4. Check Stripe Dashboard for payment status

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)

## Quick Configuration Link

Configure Stripe at: https://bolt.new/setup/stripe

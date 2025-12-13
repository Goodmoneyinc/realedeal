# Stripe Connect Payment Setup

This application uses Stripe Connect with direct charges to automatically collect a 0.5% platform fee on all transactions.

## How It Works

1. **Agents** connect their Stripe accounts through the Profile page
2. **Investors** make payments (earnest money, etc.) through the payment modal
3. **Automatic Fee Collection**: The platform automatically deducts 0.5% from each transaction
4. **Direct Deposit**: The remaining 99.5% goes directly to the agent's Stripe account

## Configuration Required

To enable payment processing, you need to add your Stripe credentials:

### 1. Get Your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create an account or sign in
3. Navigate to **Developers** → **API Keys**
4. Copy your:
   - **Publishable Key** (starts with `pk_`)
   - **Secret Key** (starts with `sk_`)

### 2. Add Environment Variables

Add these to your `.env` file:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
```

**Important**:
- The publishable key needs the `VITE_` prefix (it's used in the frontend)
- The secret key does NOT have the `VITE_` prefix (it's only used server-side)

### 3. Configure Supabase Edge Functions

The secret key needs to be available to the edge functions. This is automatically configured in Supabase.

## Features

### For Agents

- **Stripe Connect Onboarding**: Simple button click to connect Stripe account
- **Payment Status**: Clear indicators showing connection status
- **Automatic Payouts**: Funds deposited directly to your bank account
- **Transaction History**: Track all payments received

### For Investors

- **Secure Payments**: Card details handled by Stripe (PCI compliant)
- **Transparent Fees**: See the 0.5% platform fee before payment
- **Multiple Payment Types**:
  - Earnest Money Deposits
  - Platform Fees (automatic when deals close)
  - Commissions
  - Closing Costs

### Platform Fee Collection

The platform automatically collects a 0.5% fee on every transaction using Stripe's Application Fee feature:

- **Deal Close**: When a deal status changes to "closed", a platform fee payment is automatically created
- **Payment Processing**: When investors make payments, 0.5% is automatically transferred to your platform account
- **Agent Receives**: Agents receive the remaining 99.5% directly in their Stripe account

## Payment Flow

1. Investor clicks "Pay Earnest Money" or makes another payment
2. Payment modal opens with Stripe card input
3. Investor enters card details
4. Stripe creates a payment method
5. Edge function processes payment with:
   - Total amount charged to investor's card
   - 0.5% transferred to platform account
   - 99.5% transferred to agent's connected account
6. Payment record saved to database
7. Deal status updated if applicable

## Database Schema

### New Tables

- `payments`: Tracks all payment transactions with platform fee details
- `deal_contracts`: Manages contract signing workflow

### Updated Tables

- `deals`: Added earnest money and platform fee tracking
- `user_profiles`: Added Stripe Connect account fields

## Edge Functions

Three edge functions handle payment processing:

1. **process-payment**: Processes payments with automatic fee collection
2. **stripe-connect-onboard**: Handles agent Stripe account connection
3. **stripe-check-account**: Verifies and updates agent account status

## Testing

For testing, use Stripe's test mode:

1. Use test API keys (start with `pk_test_` and `sk_test_`)
2. Use test card: `4242 4242 4242 4242`
3. Any future expiry date
4. Any 3-digit CVC

## Going Live

When ready for production:

1. Get your **live** API keys from Stripe
2. Update environment variables with live keys
3. Complete your platform's Stripe account verification
4. Test with small real transactions first

## Security Notes

- Secret key is never exposed to the frontend
- Card details never touch your server (handled by Stripe)
- PCI compliance handled by Stripe
- All payments encrypted in transit
- Automatic fraud detection by Stripe

## Support

For questions about:
- **Stripe setup**: https://stripe.com/docs
- **Application fees**: https://stripe.com/docs/connect/direct-charges
- **Testing**: https://stripe.com/docs/testing

## Configuration Link

Configure Stripe at: https://bolt.new/setup/stripe

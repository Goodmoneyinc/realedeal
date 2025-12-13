# Stripe Payment Functions API Reference

## Overview

Three Supabase Edge Functions handle the complete Stripe Connect payment flow:

1. **stripe-connect-onboard** - Creates Stripe Connect accounts for agents
2. **stripe-check-account** - Verifies agent account status
3. **process-payment** - Processes payments with automatic 0.5% platform fee

---

## 1. Stripe Connect Onboarding

**Endpoint:** `POST /functions/v1/stripe-connect-onboard`

**Description:** Creates a Stripe Express account for agents and generates an onboarding URL.

**Authentication:** Required (Bearer token)

**Role Required:** Agent

**Request:**
```javascript
POST /functions/v1/stripe-connect-onboard
Authorization: Bearer <auth_token>
Content-Type: application/json

// No body required
```

**Response:**
```json
{
  "success": true,
  "url": "https://connect.stripe.com/setup/...",
  "accountId": "acct_1234567890"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Only agents can connect Stripe accounts"
}
```

**Usage Example:**
```javascript
const { data: session } = await supabase.auth.getSession();
const token = session.session?.access_token;

const response = await fetch(
  `${SUPABASE_URL}/functions/v1/stripe-connect-onboard`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  }
);

const result = await response.json();
if (result.success) {
  window.location.href = result.url; // Redirect to Stripe onboarding
}
```

---

## 2. Check Stripe Account Status

**Endpoint:** `POST /functions/v1/stripe-check-account`

**Description:** Retrieves and updates the Stripe account status for an agent.

**Authentication:** Required (Bearer token)

**Request:**
```javascript
POST /functions/v1/stripe-check-account
Authorization: Bearer <auth_token>
Content-Type: application/json

{
  "accountId": "acct_1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "account": {
    "id": "acct_1234567890",
    "charges_enabled": true,
    "payouts_enabled": true,
    "details_submitted": true,
    "status": "active"
  }
}
```

**Account Status Values:**
- `not_connected` - No Stripe account linked
- `pending` - Account created but onboarding not complete
- `active` - Fully verified and can accept payments
- `restricted` - Account has restrictions

**Error Response:**
```json
{
  "success": false,
  "error": "Stripe is not configured"
}
```

**Usage Example:**
```javascript
const { data: session } = await supabase.auth.getSession();
const token = session.session?.access_token;

const response = await fetch(
  `${SUPABASE_URL}/functions/v1/stripe-check-account`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      accountId: profile.stripe_connect_account_id,
    }),
  }
);

const result = await response.json();
if (result.success && result.account.charges_enabled) {
  console.log('Agent can now accept payments!');
}
```

---

## 3. Process Payment

**Endpoint:** `POST /functions/v1/process-payment`

**Description:** Processes a payment with automatic 0.5% platform fee collection.

**Authentication:** Required (Bearer token)

**Role Required:** Any authenticated user (typically investors)

**Request:**
```javascript
POST /functions/v1/process-payment
Authorization: Bearer <auth_token>
Content-Type: application/json

{
  "dealId": "uuid-of-deal",
  "amount": 10000.00,
  "paymentType": "earnest_money",
  "paymentMethodId": "pm_1234567890"
}
```

**Request Fields:**
- `dealId` (string, required) - UUID of the deal being paid for
- `amount` (number, required) - Payment amount in dollars (e.g., 10000.00)
- `paymentType` (string, required) - One of:
  - `earnest_money`
  - `platform_fee`
  - `commission`
  - `closing_cost`
- `paymentMethodId` (string, required) - Stripe payment method ID (created with Stripe.js)

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "uuid",
    "deal_id": "uuid",
    "payer_id": "uuid",
    "recipient_id": "uuid",
    "payment_type": "earnest_money",
    "amount": 10000.00,
    "platform_fee_amount": 50.00,
    "net_amount": 9950.00,
    "status": "completed",
    "stripe_payment_intent_id": "pi_1234567890",
    "stripe_charge_id": "ch_1234567890",
    "payment_method": "card",
    "paid_at": "2025-01-01T00:00:00.000Z",
    "metadata": {
      "platform_fee_percentage": 0.005,
      "agent_name": "John Doe"
    }
  },
  "paymentIntent": {
    "id": "pi_1234567890",
    "status": "succeeded",
    "amount": 1000000,
    "platform_fee": 5000
  }
}
```

**Error Responses:**
```json
{
  "success": false,
  "error": "Agent has not completed Stripe Connect onboarding"
}
```

```json
{
  "success": false,
  "error": "Deal not found"
}
```

```json
{
  "success": false,
  "error": "Your card was declined"
}
```

**Full Usage Example:**
```javascript
// Step 1: Create payment method with Stripe.js
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

const { error: methodError, paymentMethod } = await stripe.createPaymentMethod({
  type: 'card',
  card: cardElement, // Stripe Card Element
  billing_details: {
    name: cardholderName,
  },
});

if (methodError) {
  console.error('Card error:', methodError.message);
  return;
}

// Step 2: Process payment through edge function
const { data: session } = await supabase.auth.getSession();
const token = session.session?.access_token;

const response = await fetch(
  `${SUPABASE_URL}/functions/v1/process-payment`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      dealId: 'deal-uuid',
      amount: 10000.00,
      paymentType: 'earnest_money',
      paymentMethodId: paymentMethod.id,
    }),
  }
);

const result = await response.json();

if (result.success) {
  console.log('Payment successful!');
  console.log('Platform fee:', result.payment.platform_fee_amount);
  console.log('Agent receives:', result.payment.net_amount);
} else {
  console.error('Payment failed:', result.error);
}
```

---

## Payment Flow Diagram

```
1. Investor initiates payment
   ↓
2. Frontend creates Stripe payment method (Stripe.js)
   ↓
3. Frontend calls process-payment edge function
   ↓
4. Edge function validates:
   - User authentication
   - Deal exists
   - Agent has Stripe account
   - Agent can accept charges
   ↓
5. Calculate fees:
   - Platform fee: amount × 0.005
   - Agent receives: amount - platform fee
   ↓
6. Create Stripe Payment Intent:
   - Charge full amount to investor
   - Set application_fee_amount (0.5%)
   - Set transfer_data.destination (agent account)
   ↓
7. Stripe automatically:
   - Charges investor's card
   - Transfers 99.5% to agent
   - Transfers 0.5% to platform
   ↓
8. Save payment record to database
   ↓
9. Update deal status if earnest money
   ↓
10. Return success response
```

---

## Testing

### Test Cards

Use these test cards in development (test mode):

**Success:**
- `4242 4242 4242 4242` - Visa (successful payment)
- Any future expiry date (e.g., 12/25)
- Any 3-digit CVC (e.g., 123)

**Failure Scenarios:**
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 9995` - Insufficient funds
- `4000 0000 0000 0069` - Charge expired

### Testing Checklist

1. Agent onboards to Stripe Connect
2. Agent account becomes active
3. Investor makes payment
4. 0.5% fee is deducted
5. 99.5% goes to agent
6. Payment record saved to database
7. Deal status updated

---

## Error Handling

All functions return consistent error responses:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

Common errors:
- `"Missing authorization header"` - No auth token provided
- `"Unauthorized"` - Invalid or expired token
- `"Only agents can connect Stripe accounts"` - Wrong user role
- `"Agent has not completed Stripe Connect onboarding"` - Agent not set up
- `"Deal not found"` - Invalid deal ID
- `"Stripe is not configured"` - Missing Stripe keys

---

## Security Notes

1. **Never expose secret key** - It's only used server-side in edge functions
2. **Always validate authentication** - All requests require valid JWT
3. **Validate deal ownership** - Ensure user has permission to pay for deal
4. **Use HTTPS only** - Never send tokens over HTTP
5. **PCI compliance** - Card details never touch your server (handled by Stripe)

---

## Database Schema

### Payments Table

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id),
  payer_id UUID NOT NULL REFERENCES user_profiles(id),
  recipient_id UUID REFERENCES user_profiles(id),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('earnest_money', 'platform_fee', 'commission', 'closing_cost')),
  amount NUMERIC NOT NULL,
  platform_fee_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_transfer_id TEXT,
  payment_method TEXT DEFAULT 'card',
  paid_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### User Profiles (Stripe Fields)

```sql
ALTER TABLE user_profiles ADD COLUMN stripe_connect_account_id TEXT;
ALTER TABLE user_profiles ADD COLUMN stripe_account_status TEXT DEFAULT 'not_connected';
ALTER TABLE user_profiles ADD COLUMN stripe_charges_enabled BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT false;
```

---

## Support

- **Stripe Documentation:** https://stripe.com/docs
- **Stripe Connect:** https://stripe.com/docs/connect
- **Direct Charges:** https://stripe.com/docs/connect/direct-charges
- **Testing:** https://stripe.com/docs/testing

For setup help: https://bolt.new/setup/stripe

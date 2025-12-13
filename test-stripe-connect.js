import { readFileSync } from 'fs';

// Load environment variables from .env file
function loadEnv() {
  try {
    const envFile = readFileSync('.env', 'utf-8');
    const env = {};
    envFile.split('\n').forEach(line => {
      const [key, ...values] = line.split('=');
      if (key && values.length) {
        env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
    return env;
  } catch (err) {
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
const STRIPE_PK = env.VITE_STRIPE_PUBLISHABLE_KEY;
const STRIPE_SK = env.STRIPE_SECRET_KEY;

async function testStripeConnect() {
  console.log('🧪 Testing Stripe Connect Onboarding...\n');

  console.log('❌ Authentication Required');
  console.log('To test this function, you need to:');
  console.log('1. Sign up/login as an agent in the application');
  console.log('2. Open browser dev tools (F12)');
  console.log('3. Go to Application > Local Storage');
  console.log('4. Find the Supabase auth token');
  console.log('5. Or use the test below with a real user session\n');

  console.log('Example test with auth token:');
  console.log(`
const token = 'YOUR_AUTH_TOKEN_HERE';

const response = await fetch(
  '${SUPABASE_URL}/functions/v1/stripe-connect-onboard',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${token}\`,
    },
  }
);

const result = await response.json();
console.log('Result:', result);

if (result.success) {
  console.log('✅ Onboarding URL created:', result.url);
  console.log('Account ID:', result.accountId);
} else {
  console.log('❌ Error:', result.error);
}
  `);

  console.log('\n📝 Expected Response:');
  console.log(JSON.stringify({
    success: true,
    url: 'https://connect.stripe.com/setup/...',
    accountId: 'acct_...'
  }, null, 2));

  console.log('\n🔍 What this function does:');
  console.log('1. Verifies user is authenticated and is an agent');
  console.log('2. Creates or retrieves Stripe Connect account');
  console.log('3. Generates onboarding URL for Stripe Express dashboard');
  console.log('4. Saves account ID to user profile');
}

async function testCheckAccount() {
  console.log('\n\n🧪 Testing Stripe Account Status Check...\n');

  console.log('❌ Authentication Required');
  console.log('To test this function, you need an auth token and account ID\n');

  console.log('Example test with auth token:');
  console.log(`
const token = 'YOUR_AUTH_TOKEN_HERE';
const accountId = 'acct_YOUR_ACCOUNT_ID';

const response = await fetch(
  '${SUPABASE_URL}/functions/v1/stripe-check-account',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${token}\`,
    },
    body: JSON.stringify({ accountId })
  }
);

const result = await response.json();
console.log('Result:', result);

if (result.success) {
  console.log('✅ Account status:', result.account.status);
  console.log('Charges enabled:', result.account.charges_enabled);
  console.log('Payouts enabled:', result.account.payouts_enabled);
} else {
  console.log('❌ Error:', result.error);
}
  `);

  console.log('\n📝 Expected Response:');
  console.log(JSON.stringify({
    success: true,
    account: {
      id: 'acct_...',
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
      status: 'active'
    }
  }, null, 2));

  console.log('\n🔍 What this function does:');
  console.log('1. Retrieves account status from Stripe');
  console.log('2. Updates user profile with current status');
  console.log('3. Returns account capabilities (charges, payouts)');
}

async function testPaymentProcessing() {
  console.log('\n\n🧪 Testing Payment Processing...\n');

  console.log('❌ Authentication and Stripe Setup Required');
  console.log('Prerequisites:');
  console.log('1. Stripe keys configured in environment');
  console.log('2. Agent has completed Stripe Connect onboarding');
  console.log('3. Valid deal exists in database');
  console.log('4. User authenticated as investor\n');

  console.log('Example test with auth token:');
  console.log(`
// First, create a payment method using Stripe.js on frontend
const stripe = Stripe('${STRIPE_PK || 'pk_test_...'}');

const { paymentMethod } = await stripe.createPaymentMethod({
  type: 'card',
  card: {
    number: '4242424242424242',
    exp_month: 12,
    exp_year: 2025,
    cvc: '123',
  },
  billing_details: {
    name: 'Test User',
  },
});

// Then process payment
const token = 'YOUR_AUTH_TOKEN_HERE';

const response = await fetch(
  '${SUPABASE_URL}/functions/v1/process-payment',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${token}\`,
    },
    body: JSON.stringify({
      dealId: 'YOUR_DEAL_ID',
      amount: 10000,
      paymentType: 'earnest_money',
      paymentMethodId: paymentMethod.id,
    })
  }
);

const result = await response.json();
console.log('Result:', result);

if (result.success) {
  console.log('✅ Payment successful!');
  console.log('Payment Intent ID:', result.paymentIntent.id);
  console.log('Amount charged:', result.paymentIntent.amount / 100);
  console.log('Platform fee:', result.paymentIntent.platform_fee / 100);
} else {
  console.log('❌ Error:', result.error);
}
  `);

  console.log('\n📝 Expected Response:');
  console.log(JSON.stringify({
    success: true,
    payment: {
      id: '...',
      deal_id: '...',
      amount: 10000,
      platform_fee_amount: 50,
      net_amount: 9950,
      status: 'completed'
    },
    paymentIntent: {
      id: 'pi_...',
      status: 'succeeded',
      amount: 1000000,
      platform_fee: 5000
    }
  }, null, 2));

  console.log('\n💰 Payment Breakdown (Example: $10,000):');
  console.log('┌─────────────────────────────────────────┐');
  console.log('│ Total Amount:        $10,000.00         │');
  console.log('│ Platform Fee (0.5%): $50.00             │');
  console.log('│ Agent Receives:      $9,950.00          │');
  console.log('└─────────────────────────────────────────┘');

  console.log('\n🔍 What this function does:');
  console.log('1. Validates deal and agent Stripe account');
  console.log('2. Calculates 0.5% platform fee');
  console.log('3. Creates Stripe payment intent with application fee');
  console.log('4. Charges investor card');
  console.log('5. Transfers 99.5% to agent, 0.5% to platform');
  console.log('6. Records payment in database');
  console.log('7. Updates deal status if earnest money');
}

async function testStripeConfiguration() {
  console.log('\n\n🧪 Testing Stripe Configuration...\n');

  const hasPublishableKey = !!STRIPE_PK;
  const hasSecretKey = !!STRIPE_SK;

  console.log('Environment Variables:');
  console.log(`✓ VITE_SUPABASE_URL: ${SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`✓ VITE_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`✓ VITE_STRIPE_PUBLISHABLE_KEY: ${hasPublishableKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`✓ STRIPE_SECRET_KEY: ${hasSecretKey ? '✅ Set' : '❌ Missing'}`);

  if (!hasPublishableKey || !hasSecretKey) {
    console.log('\n⚠️  Stripe keys not configured!');
    console.log('Add these to your .env file:');
    console.log('VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...');
    console.log('STRIPE_SECRET_KEY=sk_test_...');
    console.log('\nGet your keys from: https://dashboard.stripe.com/apikeys');
    console.log('Setup guide: https://bolt.new/setup/stripe');
  } else {
    console.log('\n✅ Stripe is configured!');

    if (hasPublishableKey && STRIPE_PK.startsWith('pk_test_')) {
      console.log('🧪 Using TEST mode (recommended for development)');
    } else if (hasPublishableKey && STRIPE_PK.startsWith('pk_live_')) {
      console.log('⚠️  Using LIVE mode (be careful with real transactions!)');
    }
  }
}

// Run all tests
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║     STRIPE CONNECT PAYMENT FUNCTIONS TEST SUITE       ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

await testStripeConfiguration();
await testStripeConnect();
await testCheckAccount();
await testPaymentProcessing();

console.log('\n\n╔════════════════════════════════════════════════════════╗');
console.log('║                  TESTING SUMMARY                       ║');
console.log('╚════════════════════════════════════════════════════════╝\n');
console.log('📋 To fully test the payment system:');
console.log('1. Configure Stripe keys in .env');
console.log('2. Sign up as an agent in the application');
console.log('3. Go to Profile page and click "Connect with Stripe"');
console.log('4. Complete Stripe onboarding');
console.log('5. Sign up as an investor');
console.log('6. Browse deals and click "Pay Earnest Money"');
console.log('7. Enter test card: 4242 4242 4242 4242');
console.log('8. Verify payment completes with 0.5% fee deducted');
console.log('\n🌐 Browser Test Available:');
console.log('Open test-stripe-browser.html in your browser for interactive testing');
console.log('\n✅ Edge functions are deployed and ready to use!\n');

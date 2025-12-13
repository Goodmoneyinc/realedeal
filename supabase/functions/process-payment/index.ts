import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@14.11.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PaymentRequest {
  dealId: string;
  amount: number;
  paymentType: 'earnest_money' | 'platform_fee' | 'commission' | 'closing_cost';
  paymentMethodId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { dealId, amount, paymentType, paymentMethodId }: PaymentRequest = await req.json();

    if (!dealId || !amount || !paymentType || !paymentMethodId) {
      throw new Error('Missing required fields');
    }

    const { data: deal, error: dealError } = await supabaseClient
      .from('deals')
      .select('id, title, user_id, agent:user_id(stripe_connect_account_id, stripe_charges_enabled, full_name)')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      throw new Error('Deal not found');
    }

    const agentData = deal.agent as any;
    if (!agentData?.stripe_connect_account_id || !agentData?.stripe_charges_enabled) {
      throw new Error('Agent has not completed Stripe Connect onboarding');
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe is not configured. Please configure your Stripe secret key.');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    const platformFeePercentage = 0.005;
    const platformFeeAmount = Math.round(amount * platformFeePercentage * 100);
    const amountInCents = Math.round(amount * 100);
    const netAmount = amount - (platformFeeAmount / 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      application_fee_amount: platformFeeAmount,
      transfer_data: {
        destination: agentData.stripe_connect_account_id,
      },
      metadata: {
        dealId,
        paymentType,
        userId: user.id,
        agentId: deal.user_id,
      },
      return_url: `${Deno.env.get('SUPABASE_URL')}/payment-complete`,
    });

    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        deal_id: dealId,
        payer_id: user.id,
        recipient_id: deal.user_id,
        payment_type: paymentType,
        amount: amount,
        platform_fee_amount: platformFeeAmount / 100,
        net_amount: netAmount,
        status: paymentIntent.status === 'succeeded' ? 'completed' : 'processing',
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: paymentIntent.latest_charge as string,
        payment_method: 'card',
        paid_at: paymentIntent.status === 'succeeded' ? new Date().toISOString() : null,
        metadata: {
          platform_fee_percentage: platformFeePercentage,
          agent_name: agentData.full_name,
        },
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to record payment: ${paymentError.message}`);
    }

    if (paymentType === 'earnest_money') {
      await supabaseClient
        .from('deals')
        .update({ earnest_money_status: 'paid' })
        .eq('id', dealId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment,
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          platform_fee: platformFeeAmount,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Payment processing error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Payment processing failed',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@14.11.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role, stripe_connect_account_id, email, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    if (profile.role !== 'agent') {
      throw new Error('Only agents can connect Stripe accounts');
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe is not configured. Please configure your Stripe secret key.');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    let accountId = profile.stripe_connect_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: profile.email,
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          user_id: user.id,
          full_name: profile.full_name,
        },
      });

      accountId = account.id;

      await supabaseClient
        .from('user_profiles')
        .update({
          stripe_connect_account_id: accountId,
          stripe_account_status: 'pending',
        })
        .eq('id', user.id);
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${Deno.env.get('SUPABASE_URL')}/profile?stripe_refresh=true`,
      return_url: `${Deno.env.get('SUPABASE_URL')}/profile?stripe_connected=true`,
      type: 'account_onboarding',
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: accountLink.url,
        accountId,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Stripe Connect onboarding error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create Stripe Connect account',
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
// Sync Pro status from Stripe for logged-in user (fixes missed webhooks)
// Deploy: supabase functions deploy activate-pro --project-ref zjpvxacinryojpqwdrti

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function detectType(amount: number | null, mode?: string): string {
  if (amount === 24900) return "lifetime";
  if (amount === 7900) return "pro_yearly";
  if (amount === 790) return "pro";
  if (mode === "subscription") return "pro";
  return "pro";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_ANON_KEY") || "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    { auth: { persistSession: false } }
  );

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !user?.email) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "stripe_not_configured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  let isPro = false;
  let subscriptionType = "pro";
  let customerId: string | null = null;

  const customers = await stripe.customers.list({ email: user.email, limit: 10 });

  for (const customer of customers.data) {
    customerId = customer.id;

    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 5,
    });
    if (subs.data.length > 0) {
      isPro = true;
      subscriptionType = "pro";
    }

    const sessions = await stripe.checkout.sessions.list({
      customer: customer.id,
      limit: 20,
    });
    for (const session of sessions.data) {
      if (session.payment_status === "paid") {
        isPro = true;
        subscriptionType = detectType(session.amount_total, session.mode || undefined);
      }
    }
  }

  // Fallback: search recent paid sessions by email
  if (!isPro) {
    const sessions = await stripe.checkout.sessions.list({ limit: 100 });
    for (const session of sessions.data) {
      const email = session.customer_details?.email || session.customer_email;
      if (email?.toLowerCase() === user.email.toLowerCase() && session.payment_status === "paid") {
        isPro = true;
        subscriptionType = detectType(session.amount_total, session.mode || undefined);
        customerId = (session.customer as string) || customerId;
        break;
      }
    }
  }

  if (!isPro) {
    return new Response(JSON.stringify({ is_pro: false }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const proMeta = {
    pro: true,
    is_pro: true,
    subscription_type: subscriptionType,
    stripe_customer_id: customerId,
  };

  await supabaseAdmin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, ...proMeta },
    user_metadata: { ...user.user_metadata, pro: true, is_pro: true },
  });

  await supabaseAdmin.from("profiles").upsert({
    id: user.id,
    email: user.email,
    is_pro: true,
    subscription_type: subscriptionType,
    stripe_customer_id: customerId,
    updated_at: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({ is_pro: true, subscription_type: subscriptionType }),
    { headers: { ...cors, "Content-Type": "application/json" } }
  );
});
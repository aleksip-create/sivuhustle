// Supabase Edge Function for Stripe Webhook
// Project: zjpvxacinryojpqwdrti
// Deploy with: supabase functions deploy stripe-webhook --no-verify-jwt
//
// After deploy, set secrets:
// supabase secrets set STRIPE_SECRET_KEY=sk_live_...
// supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
// supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ... (service role from dashboard)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  { auth: { persistSession: false } }
);

const PRODUCT_IDS = {
  proMonthly: "prod_Ulms5V3wxRk3ec",
  lifetime: "prod_UlmzHGbnYJ9xAj",
};

async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("email", normalized)
    .maybeSingle();

  if (profile?.id) {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (userData?.user) return userData.user;
  }

  let page = 1;
  const perPage = 200;
  while (page <= 20) {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    const match = data?.users?.find(
      (u) => u.email?.toLowerCase() === normalized
    );
    if (match) return match;
    if (!data?.users?.length || data.users.length < perPage) break;
    page++;
  }

  return null;
}

function detectPlan(session: Stripe.Checkout.Session): string {
  if (session.metadata?.plan) {
    return session.metadata.plan;
  }

  const lineItem = session.line_items?.data?.[0];
  const product = lineItem?.price?.product;
  const productId = typeof product === "string" ? product : product?.id;

  if (productId === PRODUCT_IDS.lifetime) return "lifetime";
  if (productId === PRODUCT_IDS.proMonthly) {
    return session.mode === "subscription" ? "pro" : "pro_yearly";
  }

  // Fallback: amount in cents (EUR)
  switch (session.amount_total) {
    case 24900:
      return "lifetime";
    case 7900:
      return "pro_yearly";
    case 790:
      return "pro";
    default:
      return "pro";
  }
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

  if (!signature || !webhookSecret) {
    return new Response("Missing signature or secret", { status: 400 });
  }

  let event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items.data.price.product"],
        });

        const email =
          fullSession.customer_details?.email || fullSession.customer_email;
        const customerId = fullSession.customer as string;
        const amount = fullSession.amount_total;
        const currency = fullSession.currency;

        if (!email) {
          console.log("No email in session");
          break;
        }

        console.log(`Payment successful for ${email} - ${amount} ${currency}`);

        const subscriptionType = detectPlan(fullSession);

        let userId: string | null = null;
        const existingUser = await findUserByEmail(email);
        const proMeta = {
          pro: true,
          is_pro: true,
          subscription_type: subscriptionType,
          stripe_customer_id: customerId,
        };

        if (existingUser) {
          userId = existingUser.id;
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            app_metadata: {
              ...existingUser.app_metadata,
              ...proMeta,
            },
            user_metadata: {
              ...existingUser.user_metadata,
              pro: true,
              is_pro: true,
            },
          });
          if (updateError) console.error("Error updating user:", updateError);
        } else {
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: true,
            app_metadata: proMeta,
            user_metadata: {
              source: "stripe_payment",
              pro: true,
              is_pro: true,
            },
          });

          if (createError) {
            console.error("Error creating user:", createError);
          } else {
            userId = newUser.user.id;
          }
        }

        if (userId) {
          const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
            id: userId,
            email,
            is_pro: true,
            subscription_type: subscriptionType,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          });
          if (profileError) console.error("Error upserting profile:", profileError);
        }

        // Stripe-tilillä ei ole salasanaa — lähetä linkki salasanan asettamiseen
        try {
          await supabaseAdmin.auth.resetPasswordForEmail(email, {
            redirectTo: "https://www.sivuhustle.fi/index.html?login=1",
          });
          console.log(`Password setup email sent to ${email}`);
        } catch (emailErr) {
          console.error("Could not send password setup email:", emailErr);
        }

        console.log(`User account created/updated for ${email} with ${subscriptionType} access`);
        break;
      }

      case "invoice.paid": {
        // Handle recurring payments for monthly/yearly
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        // Update subscription status if needed
        if (customerId) {
          const { data } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (data) {
            await supabaseAdmin
              .from("profiles")
              .update({ is_pro: true, updated_at: new Date().toISOString() })
              .eq("id", data.id);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        if (customerId) {
          const { data } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          if (data?.id) {
            await supabaseAdmin.from("profiles").update({
              is_pro: false,
              subscription_type: "free",
              updated_at: new Date().toISOString(),
            }).eq("id", data.id);
            const { data: userData } = await supabaseAdmin.auth.admin.getUserById(data.id);
            if (userData?.user) {
              await supabaseAdmin.auth.admin.updateUserById(data.id, {
                app_metadata: { ...userData.user.app_metadata, pro: false, is_pro: false },
                user_metadata: { ...userData.user.user_metadata, pro: false, is_pro: false },
              });
            }
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Error processing webhook:", err);
    return new Response("Webhook handler error", { status: 500 });
  }
});
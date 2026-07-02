// Lähettää kirjautumis- ja salasanalinkin Resendillä (ohittaa rikkinäisen Supabase SMTP:n)
// Deploy: supabase functions deploy send-login-link --no-verify-jwt --project-ref zjpvxacinryojpqwdrti
// Tarvitsee: RESEND_API_KEY + SUPABASE_SERVICE_ROLE_KEY (automaattinen Edge Functionissa)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function loginHtml(link: string, title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fi">
<body style="font-family:system-ui,sans-serif;background:#f8fafc;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
    <p style="color:#059669;font-size:12px;font-weight:700;letter-spacing:1px">SIVUHUSTLE.FI</p>
    <h1 style="font-size:22px;color:#0f172a;margin:12px 0">${title}</h1>
    <p style="color:#475569;font-size:15px;line-height:1.6">${body}</p>
    <a href="${link}" style="display:inline-block;margin:20px 0;background:#059669;color:#fff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:12px">Jatka →</a>
    <p style="color:#94a3b8;font-size:11px;margin-top:24px">Linkki toimii kerran. Jos et pyytänyt tätä, jätä viesti huomiotta.</p>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const action = body.action === "recovery" ? "recovery" : "magiclink";
    const redirectTo = (body.redirect_to || "https://www.sivuhustle.fi/index.html").trim();

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

    if (!resendKey || !serviceKey || !supabaseUrl) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.auth.admin.generateLink({
      type: action,
      email,
      options: { redirectTo },
    });

    if (error || !data?.properties?.action_link) {
      console.error("generateLink:", error);
      return new Response(JSON.stringify({
        error: error?.message || "User not found or link generation failed",
      }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const link = data.properties.action_link;
    const isRecovery = action === "recovery";
    const subject = isRecovery
      ? "Aseta salasana — SivuHustle.fi"
      : "Kirjaudu SivuHustle.fi -palveluun";
    const title = isRecovery ? "Aseta uusi salasana" : "Kirjaudu sisään";
    const text = isRecovery
      ? "Klikkaa alla olevaa painiketta asettaaksesi salasanan."
      : "Klikkaa alla olevaa painiketta kirjautuaksesi Pro-tilillesi.";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SivuHustle <asiakaspalvelu@sivuhustle.fi>",
        to: [email],
        reply_to: "asiakaspalvelu@sivuhustle.fi",
        subject,
        html: loginHtml(link, title, text),
      }),
    });

    const resendData = await res.json();
    if (!res.ok) {
      console.error("Resend:", resendData);
      return new Response(JSON.stringify({ ok: false, error: resendData }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
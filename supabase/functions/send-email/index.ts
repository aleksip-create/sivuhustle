// Auth Send Email Hook — lähettää kirjautumislinkit Resendillä
// Deploy: supabase functions deploy send-email --no-verify-jwt --project-ref zjpvxacinryojpqwdrti
// Secret: SEND_EMAIL_HOOK_SECRET (Auth Hooks → Send email → kopioi secret)
// RESEND_API_KEY on jo asetettu

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://zjpvxacinryojpqwdrti.supabase.co";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const HOOK_SECRET_RAW = Deno.env.get("SEND_EMAIL_HOOK_SECRET") || "";

const subjects: Record<string, string> = {
  magiclink: "Kirjaudu SivuHustle.fi -palveluun",
  recovery: "Aseta salasana — SivuHustle.fi",
  signup: "Vahvista sähköpostisi — SivuHustle.fi",
  invite: "Kutsu SivuHustle.fi -palveluun",
  email_change: "Vahvista uusi sähköpostiosoite",
};

function buildVerifyUrl(
  tokenHash: string,
  actionType: string,
  redirectTo: string,
): string {
  const base = `${SUPABASE_URL}/auth/v1/verify`;
  const params = new URLSearchParams({
    token: tokenHash,
    type: actionType,
    redirect_to: redirectTo || "https://www.sivuhustle.fi/index.html",
  });
  return `${base}?${params.toString()}`;
}

function emailHtml(actionType: string, link: string, otp: string): string {
  const titles: Record<string, string> = {
    magiclink: "Kirjaudu sisään",
    recovery: "Aseta uusi salasana",
    signup: "Vahvista sähköpostisi",
    invite: "Hyväksy kutsu",
    email_change: "Vahvista sähköposti",
  };
  const title = titles[actionType] || "SivuHustle.fi";
  return `<!DOCTYPE html>
<html lang="fi">
<body style="font-family:system-ui,sans-serif;background:#f8fafc;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
    <p style="color:#059669;font-size:12px;font-weight:700;letter-spacing:1px">SIVUHUSTLE.FI</p>
    <h1 style="font-size:22px;color:#0f172a;margin:12px 0">${title}</h1>
    <p style="color:#475569;font-size:15px;line-height:1.6">Klikkaa alla olevaa painiketta. Linkki toimii kerran ja vanhenee pian.</p>
    <a href="${link}" style="display:inline-block;margin:20px 0;background:#059669;color:#fff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:12px">Jatka →</a>
    <p style="color:#94a3b8;font-size:12px">Tai käytä koodia: <strong>${otp}</strong></p>
    <p style="color:#94a3b8;font-size:11px;margin-top:24px">Jos et pyytänyt tätä, voit jättää viestin huomiotta.</p>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  if (!RESEND_KEY || !HOOK_SECRET_RAW) {
    return new Response(
      JSON.stringify({ error: { message: "RESEND_API_KEY or SEND_EMAIL_HOOK_SECRET missing" } }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const hookSecret = HOOK_SECRET_RAW.replace("v1,whsec_", "");
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let user: { email: string };
  let email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
  };

  try {
    const wh = new Webhook(hookSecret);
    const verified = wh.verify(payload, headers) as {
      user: { email: string };
      email_data: typeof email_data;
    };
    user = verified.user;
    email_data = verified.email_data;
  } catch (err) {
    console.error("Webhook verify failed:", err);
    return new Response(
      JSON.stringify({ error: { message: "invalid hook signature" } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const action = email_data.email_action_type || "magiclink";
  const link = buildVerifyUrl(
    email_data.token_hash,
    action,
    email_data.redirect_to,
  );
  const subject = subjects[action] || "SivuHustle.fi";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SivuHustle <asiakaspalvelu@sivuhustle.fi>",
      to: [user.email],
      reply_to: "asiakaspalvelu@sivuhustle.fi",
      subject,
      html: emailHtml(action, link, email_data.token),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Resend error:", data);
    return new Response(JSON.stringify({ error: data }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
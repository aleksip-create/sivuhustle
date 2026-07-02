// Päivä 3 + päivä 7 -seurantasähköpostit PDF-leadeille (Resend)
// Deploy: supabase functions deploy process-lead-followups --no-verify-jwt
// Secrets:
//   RESEND_API_KEY=re_...
//   SUPABASE_SERVICE_ROLE_KEY=eyJ...
//   CRON_SECRET=valitse-pitka-satunnainen
//
// Kutsu päivittäin (Supabase Cron / ulkoinen scheduler):
//   POST .../functions/v1/process-lead-followups
//   Header: X-Cron-Secret: <CRON_SECRET>

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const HOME = "https://www.sivuhustle.fi";

function firstName(name: string | null, email: string) {
  if (name && name.trim()) return name.trim().split(" ")[0];
  return email.split("@")[0] || "siellä";
}

function day3Html(name: string) {
  return `<!DOCTYPE html>
<html lang="fi">
<body style="font-family:Inter,system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
    <p style="color:#059669;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">SivuHustle.fi · Päivä 3</p>
    <h1 style="font-size:22px;color:#0f172a;margin:12px 0 8px">Hei ${name} — 3 konkreettista askelta</h1>
    <p style="color:#475569;font-size:15px;line-height:1.6">Moni jättää sivutulot "myöhemmäksi". Nämä kolme asiaa vievät sinut eteenpäin tällä viikolla:</p>
    <ol style="color:#475569;font-size:14px;line-height:1.8;padding-left:20px">
      <li><strong>Laske numero:</strong> <a href="${HOME}/#laskuri" style="color:#059669">Tulolaskuri</a> — kirjoita realistinen tavoite ylös.</li>
      <li><strong>Valitse yksi polku:</strong> <a href="${HOME}/affiliate-opas.html" style="color:#059669">Affiliate</a>, <a href="${HOME}/digituote-opas.html" style="color:#059669">digituote</a> tai <a href="${HOME}/blogi-opas.html" style="color:#059669">blogi</a>.</li>
      <li><strong>Hanki työkalut:</strong> <a href="${HOME}/tyokalut-vertailu.html" style="color:#059669">Vertailu</a> — hosting, Canva, sähköpostilista.</li>
    </ol>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin-top:20px">Jos et ole vielä avannut opasta: <a href="${HOME}/kaynnistys-opas.html?lead=1" style="color:#059669">7 päivän käynnistysopas</a></p>
    <p style="color:#94a3b8;font-size:12px;margin-top:28px">Vastaa tähän viestiin jos tarvitset apua — asiakaspalvelu@sivuhustle.fi</p>
  </div>
</body>
</html>`;
}

function day7Html(name: string) {
  return `<!DOCTYPE html>
<html lang="fi">
<body style="font-family:Inter,system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
    <p style="color:#059669;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">SivuHustle.fi · Päivä 7</p>
    <h1 style="font-size:22px;color:#0f172a;margin:12px 0 8px">${name}, valmis nopeuttamaan?</h1>
    <p style="color:#475569;font-size:15px;line-height:1.6">Viikko on kulunut ilmaisesta oppaasta. Seuraava askel on yleensä joko:</p>
    <ul style="color:#475569;font-size:14px;line-height:1.8;padding-left:20px">
      <li>jatkaa hitaasti ilmaisilla vinkeillä, tai</li>
      <li>ottaa <strong>kaikki oppaat ja mallit kerralla</strong> ja säästää viikkoja.</li>
    </ul>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:20px;margin-top:24px">
      <p style="margin:0;font-size:14px;color:#065f46"><strong>Pro 7,90 €/kk</strong> — kaikki oppaat, valmiit mallit, 24 kk laskuri. Peru milloin tahansa.</p>
      <a href="${HOME}/#hinnat" style="display:inline-block;margin-top:12px;background:#059669;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px;font-size:14px">Katso Pro-hinnat</a>
    </div>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin-top:20px">Etkö ole valmis Prohon? Jatka ilmaisella <a href="${HOME}/oppaat.html" style="color:#059669">oppaavalikoimalla</a> — ei painetta.</p>
    <p style="color:#94a3b8;font-size:12px;margin-top:28px">Kysymyksiä? asiakaspalvelu@sivuhustle.fi</p>
  </div>
</body>
</html>`;
}

async function sendResend(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SivuHustle <asiakaspalvelu@sivuhustle.fi>",
      to: [to],
      reply_to: "asiakaspalvelu@sivuhustle.fi",
      subject,
      html,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerSecret = req.headers.get("X-Cron-Secret");
  if (!cronSecret || headerSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!resendKey) {
    return new Response(JSON.stringify({ ok: true, skipped: "no_resend_key" }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!serviceKey || !supabaseUrl) {
    return new Response(JSON.stringify({ error: "Missing Supabase config" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const now = new Date();
  const day3Cutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const day7Cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const stats = { day3_sent: 0, day7_sent: 0, day3_errors: 0, day7_errors: 0 };

  try {
    const { data: day3Leads, error: day3Err } = await sb
      .from("leads")
      .select("id, email, name")
      .is("email_day3_sent_at", null)
      .lte("created_at", day3Cutoff)
      .limit(50);

    if (day3Err) throw day3Err;

    for (const lead of day3Leads || []) {
      const fn = firstName(lead.name, lead.email);
      try {
        await sendResend(
          resendKey,
          lead.email,
          `${fn}, 3 askelta sivutuloihin tällä viikolla`,
          day3Html(fn),
        );
        await sb.from("leads").update({ email_day3_sent_at: now.toISOString() })
          .eq("id", lead.id);
        stats.day3_sent++;
      } catch (e) {
        console.error("Day3 failed:", lead.email, e);
        stats.day3_errors++;
      }
    }

    const { data: day7Leads, error: day7Err } = await sb
      .from("leads")
      .select("id, email, name")
      .is("email_day7_sent_at", null)
      .lte("created_at", day7Cutoff)
      .limit(50);

    if (day7Err) throw day7Err;

    for (const lead of day7Leads || []) {
      const fn = firstName(lead.name, lead.email);
      try {
        await sendResend(
          resendKey,
          lead.email,
          `${fn}, viikko takana — haluatko nopeuttaa?`,
          day7Html(fn),
        );
        await sb.from("leads").update({ email_day7_sent_at: now.toISOString() })
          .eq("id", lead.id);
        stats.day7_sent++;
      } catch (e) {
        console.error("Day7 failed:", lead.email, e);
        stats.day7_errors++;
      }
    }

    return new Response(JSON.stringify({ ok: true, ...stats }), {
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
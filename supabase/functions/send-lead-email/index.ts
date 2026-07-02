// Tervetulosähköposti PDF-leadeille (Resend)
// Deploy: supabase functions deploy send-lead-email --no-verify-jwt
// Secret: supabase secrets set RESEND_API_KEY=re_...

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function welcomeHtml(firstName: string) {
  const home = "https://www.sivuhustle.fi";
  return `<!DOCTYPE html>
<html lang="fi">
<body style="font-family:Inter,system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
    <p style="color:#059669;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">SivuHustle.fi</p>
    <h1 style="font-size:24px;color:#0f172a;margin:12px 0 8px">Hei ${firstName} — opas on valmis</h1>
    <p style="color:#475569;font-size:15px;line-height:1.6">Kiitos ilmoittautumisesta. Tässä seuraavat askeleet:</p>
    <ol style="color:#475569;font-size:14px;line-height:1.8;padding-left:20px">
      <li>Avaa <a href="${home}/kaynnistys-opas.html?lead=1" style="color:#059669">7 päivän käynnistysopas</a></li>
      <li>Kokeile <a href="${home}/#laskuri" style="color:#059669">ilmaista tulolaskuria</a></li>
      <li>Valitse polku: <a href="${home}/affiliate-opas.html" style="color:#059669">affiliate</a>, <a href="${home}/digituote-opas.html" style="color:#059669">digituote</a> tai <a href="${home}/blogi-opas.html" style="color:#059669">blogi</a></li>
      <li>Työkalut: <a href="${home}/tyokalut-vertailu.html" style="color:#059669">suositellut alustat</a> (hosting, Canva, Gumroad…)</li>
    </ol>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:20px;margin-top:24px">
      <p style="margin:0;font-size:14px;color:#065f46"><strong>Haluat nopeuttaa?</strong> Pro-jäsenyys sisältää kaikki oppaat, mallit ja 24 kk laskurin.</p>
      <a href="${home}/#hinnat" style="display:inline-block;margin-top:12px;background:#059669;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px;font-size:14px">Katso Pro 7,90 €/kk</a>
    </div>
    <p style="color:#94a3b8;font-size:12px;margin-top:28px">Kysymyksiä? Vastaa tähän viestiin tai kirjoita asiakaspalvelu@sivuhustle.fi</p>
  </div>
</body>
</html>`;
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

  try {
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const name = (body.name || "").trim();
    const firstName = name.split(" ")[0] || "siellä";

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_resend_key" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

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
        subject: `${firstName}, tässä 7 päivän sivuhustle-opas`,
        html: welcomeHtml(firstName),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(JSON.stringify({ ok: false, error: data }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: data.id }), {
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
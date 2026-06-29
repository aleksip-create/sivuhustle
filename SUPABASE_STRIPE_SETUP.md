# Supabase + Stripe Setup – Helppo ohje (tee vain nämä)

## Mitä olen jo tehnyt sinulle
- Supabase-kirjautuminen on valmis index.html:ssä (avaimet täytetty)
- Login / Rekisteröidy -napit ovat navigaatiomenussa
- Stripe webhook -koodi on valmis tiedostossa supabase/functions/stripe-webhook/index.ts
- Kiitos-sivu (kiitos.html) on valmis
- profiles.sql on valmis

**Tiedosto `supabase/db/profiles.sql` löytyy tästä kansiosta:**
`SivuHustle / supabase / db / profiles.sql`

Mutta helpointa on kopioida alla oleva koodi suoraan.

Sinun tarvitsee tehdä **vain** nämä asiat:

---

### 1. Luo profiili-taulu Supabaseen (valmis!)

Olet jo tehnyt tämän. Hyvä!

"Success. No rows returned" on **täysin normaalia** – se tarkoittaa että taulu luotiin onnistuneesti (ei lisännyt rivejä).

Jatka seuraavaan kohtaan.

---

### 2. Hae tarvittavat avaimet (tee nämä nyt)

**Kyllä, webhook täytyy luoda Stripeen erikseen.** 

Se on "Add endpoint" Stripe dashboardissa. Se luo uuden hookin, joka lähettää maksutiedot sun Supabase-funktioon.

Funktio on jo koodissa valmiina.

**Oikea järjestys:**

1. Hae Stripe Secret Key (sk_test_ tai sk_live_)
   - Mene Stripe: https://dashboard.stripe.com/
   - Developers → API keys
   - Kopioi Secret key. Lähetä se minulle.

2. Luo webhook Stripeen (tämä antaa whsec_ avaimen)
   - Mene Developers → Webhooks
   - Klikkaa "Add endpoint"
   - Endpoint URL: https://zjpvxacinryojpqwdrti.supabase.co/functions/v1/stripe-webhook
   - Valitse eventit: checkout.session.completed ja invoice.paid
   - Lisää
   - Sitten kopioi Signing secret (whsec_...). Lähetä se minulle.

3. Aseta salaisuudet (kun sinulla on sk_ ja whsec_)

4. Deploy funktio

**C. Supabase Service Role Key**
- Hae Dashboard → Settings → API → `service_role` (älä commitoi repoon, vain Supabase secrets)

---

### 3. Aseta salaisuudet Supabaseen (kopioi nämä komennot)

**Tärkeää:** Avaa ensin terminaali (PowerShell tai Command Prompt) ja mene oikeaan kansioon:

```bash
cd "C:\Users\Käyttäjä\OneDrive - lucit\Työpöytä\Sälä\SivuHustle"
```

Sitten aja nämä **yksi kerrallaan**. Korvaa ... osat omilla Stripe-avaimillasi (katso ohjeet alla).

1. Jos et ole kirjautunut:
```bash
supabase login
```

2. Linkitä projekti (jos ei ole tehty):
```bash
supabase link --project-ref zjpvxacinryojpqwdrti
```

3. Aseta Stripe Secret Key:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_REPLACE_THIS_WITH_YOUR_STRIPE_SECRET_KEY
```

4. Aseta Stripe Webhook Signing secret:
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_REPLACE_THIS_WITH_YOUR_WHSEC
```

5. ~~Aseta Supabase Service key~~ **EI TARVITA**
   - `SUPABASE_URL` ja `SUPABASE_SERVICE_ROLE_KEY` injektoidaan automaattisesti Edge Functioneihin.
   - CLI hylkää `SUPABASE_*`-nimiset secretit (varattu etuliite).

6. Aseta vain Stripe-avaimet (kun ne on haettu):
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_REPLACE
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_REPLACE
```

---

### 4. Deploy webhook + lisää Stripeen

1. Deploy funktio:
   ```bash
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```

2. Mene Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**

3. Lisää nämä tiedot:
   - **Endpoint URL**: `https://zjpvxacinryojpqwdrti.supabase.co/functions/v1/stripe-webhook`
   - Valitse eventit:
     - `checkout.session.completed`
     - `invoice.paid`
   - Tallenna
   - Kopioi **Signing secret** (whsec_...) ja käytä sitä edellisessä askeleessa

---

### 5. Aseta Success URL:t Stripe Payment Linkkeihin (tärkeää!)

Mene Stripe → Payment Links ja muokkaa jokaista kolmea linkkiäsi:

**Pro kuukausi** (prod_Ulms5V3wxRk3ec):
→ Success URL: `https://sivuhustle.fi/kiitos.html?plan=pro`

**Pro vuosi**:
→ Success URL: `https://sivuhustle.fi/kiitos.html?plan=pro_yearly`

**Lifetime**:
→ Success URL: `https://sivuhustle.fi/kiitos.html?plan=lifetime`

Tallenna.

---

### Valmis!

Kun nämä on tehty:
- Kirjaudu / rekisteröidy toimii sivulla
- Kun joku maksaa Stripe-linkin kautta, webhook luo automaattisesti käyttäjätilin ja antaa Pro-oikeudet
- Käyttäjä näkee PRO-badgen navigaatiosta

---

**Tarvitsetko apua johonkin tiettyyn kohtaan?** Kerro missä kohdassa olet ja mitä näkyy virheilmoituksena, niin autan tarkasti.
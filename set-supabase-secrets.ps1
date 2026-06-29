# Huom: SUPABASE_URL ja SUPABASE_SERVICE_ROLE_KEY injektoidaan automaattisesti
# Edge Functioneihin — niitä EI voi (eikä tarvitse) asettaa secrets-komennolla.
#
# Tämä skripti asettaa vain Stripe-salaisuudet, kun ne on saatavilla.
# Korvaa arvot omilla Stripe-avaimillasi ennen ajoa.

$supabase = "$env:LOCALAPPDATA\supabase-cli\supabase.exe"
if (-not (Test-Path $supabase)) {
    Write-Error "Supabase CLI ei löydy."
    exit 1
}

Set-Location $PSScriptRoot

Write-Host "Linkitetään projekti..." -ForegroundColor Cyan
& $supabase link --project-ref zjpvxacinryojpqwdrti --yes

# Esimerkki — poista kommentit ja korvaa arvot kun avaimet on valmiina:
# & $supabase secrets set STRIPE_SECRET_KEY=sk_test_...
# & $supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
# & $supabase secrets set RESEND_API_KEY=re_...

Write-Host ""
Write-Host "SUPABASE_URL ja SUPABASE_SERVICE_ROLE_KEY ovat automaattisia — ei tarvitse asettaa." -ForegroundColor Green
Write-Host "Seuraavaksi: Stripe + Resend (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY)." -ForegroundColor Yellow
Write-Host "Deploy lead-sähköposti: supabase functions deploy send-lead-email --no-verify-jwt" -ForegroundColor Yellow
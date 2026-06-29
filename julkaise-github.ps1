# SivuHustle → GitHub + valmis Vercel-deployausta varten
# Aja: oikealla painikkeella → "Run with PowerShell"

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$gh = "C:\Program Files\GitHub CLI\gh.exe"
$git = "C:\Program Files\Git\bin\git.exe"

if (-not (Test-Path $gh)) {
    Write-Host "GitHub CLI puuttuu. Asenna: winget install GitHub.cli" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "=== SivuHustle GitHub-julkaisu ===" -ForegroundColor Cyan
Write-Host ""

# 1. Kirjautuminen (kerran)
$auth = & $gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Avataan selain — kirjaudu GitHub-tilille aleksip-create ja hyväksy." -ForegroundColor Yellow
    & $gh auth login -h github.com -p https -w
}

# 2. Luo repo ja pushaa
Write-Host ""
Write-Host "Luodaan repo aleksip-create/sivuhustle ja lähetetään tiedostot..." -ForegroundColor Cyan

& $git branch -M main

$remote = & $git remote get-url origin 2>$null
if (-not $remote) {
    & $gh repo create sivuhustle --public --source=. --remote=origin --push
} else {
    & $git push -u origin main
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "VALMIS!" -ForegroundColor Green
    Write-Host "Repo: https://github.com/aleksip-create/sivuhustle" -ForegroundColor Green
    Write-Host ""
    Write-Host "Seuraavaksi Vercelissä:" -ForegroundColor Yellow
    Write-Host "  1. vercel.com/dashboard → SivuHustle → Settings → Git"
    Write-Host "  2. Connect Git Repository → valitse aleksip-create/sivuhustle"
    Write-Host ""
} else {
    Write-Host "Jokin meni pieleen. Kerro virheilmoitus Grokille." -ForegroundColor Red
}

pause
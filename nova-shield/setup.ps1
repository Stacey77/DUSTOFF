# Nova Shield local setup (Windows PowerShell 5.1 or PowerShell 7)
# Creates .env with fresh random keys. .env stays on this machine; it is git-ignored.
#   .\setup.ps1                                  # random HELIX password, printed once
#   .\setup.ps1 -HelixConsoleFile "C:\path\to\helix-console\index.html"
param(
  [string]$HelixUsername = "stacey",
  [string]$HelixPassword = "",
  [string]$HelixConsoleFile = "",
  [switch]$Force
)
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

if ((Test-Path -LiteralPath ".env") -and -not $Force) {
  Write-Host ".env already exists. Re-run with -Force to replace it (this logs everyone out)." -ForegroundColor Yellow
  exit 0
}

function New-Key {
  $b = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  -join ($b | ForEach-Object { '{0:x2}' -f $_ })
}

$admin = New-Key; $demo = New-Key; $helix = New-Key; $nexum = New-Key
if (-not $HelixPassword) { $HelixPassword = (New-Key).Substring(0, 20) }
$hash = (node apps/helix/hash-password.js $HelixPassword).Trim()
if ($LASTEXITCODE -ne 0 -or -not $hash.StartsWith('scrypt$')) { throw "Could not hash the HELIX password (is Node installed?)" }

if (-not $HelixConsoleFile) {
  $guess = Join-Path $env:USERPROFILE "NovaSite\rag7\nova-digitus-site\try\helix-console\index.html"
  if (Test-Path -LiteralPath $guess) { $HelixConsoleFile = $guess }
}

@"
SHIELD_HOST=127.0.0.1
SHIELD_PORT=4000
SHIELD_ADMIN_KEY=$admin
SHIELD_APP_KEYS=demo:$demo,helix:$helix,nexum:$nexum
SHIELD_CORE_URL=http://127.0.0.1:4000

DEMO_PORT=3000
SHIELD_APP_KEY=$demo

HELIX_PORT=4100
HELIX_SHIELD_APP_KEY=$helix
HELIX_USERNAME=$HelixUsername
HELIX_PASSWORD_HASH=$hash
HELIX_CONSOLE_FILE=$HelixConsoleFile
"@ | Set-Content -LiteralPath ".env" -Encoding utf8

Write-Host ""
Write-Host "Nova Shield .env created (kept on this PC only)." -ForegroundColor Green
Write-Host "  Shield Console admin key : $admin"
Write-Host "  HELIX username           : $HelixUsername"
Write-Host "  HELIX password           : $HelixPassword"
if ($HelixConsoleFile) { Write-Host "  HELIX Console page       : $HelixConsoleFile" } else { Write-Host "  HELIX Console page       : not found, so a placeholder is shown" -ForegroundColor Yellow }
Write-Host ""
Write-Host "Save these in your password manager. They are not shown again."

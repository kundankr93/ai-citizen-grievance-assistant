$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Server = Join-Path $Root 'server'
$Client = Join-Path $Root 'client'

Write-Host ''
Write-Host '  CivicConnect AI - Local Setup' -ForegroundColor Cyan
Write-Host '  React + Express + PostgreSQL' -ForegroundColor DarkCyan
Write-Host ''

if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js 20+ and npm are required. Install from https://nodejs.org/ then run this script again.' -ForegroundColor Red
  exit 1
}
$NodeVersion = [int]((node -p "process.versions.node.split('.')[0]").Trim())
if ($NodeVersion -lt 20) {
  Write-Host "Node.js 20 or later is required. Current major version: $NodeVersion" -ForegroundColor Red
  exit 1
}

$EnvFile = Join-Path $Server '.env'
if (-not (Test-Path $EnvFile)) {
  Copy-Item (Join-Path $Server '.env.example') $EnvFile
  Write-Host 'Created server/.env from the example. It runs in DEMO MODE until you add a valid Gemini API key.' -ForegroundColor Yellow
}
# Generate a unique local JWT secret if the template/default placeholder is still present.
$EnvLines = @(Get-Content $EnvFile)
$JwtLine = $EnvLines | Where-Object { $_ -match '^JWT_SECRET=' } | Select-Object -First 1
if (-not $JwtLine -or $JwtLine -match 'GENERATE_A_RANDOM_SECRET|replace-this-with-a-long-random-secret|development-only-change-this-secret') {
  $Bytes = New-Object byte[] 48
  $Rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $Rng.GetBytes($Bytes)
  $Rng.Dispose()
  $NewSecret = [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
  if ($JwtLine) {
    $EnvLines = @($EnvLines | ForEach-Object { if ($_ -match '^JWT_SECRET=') { "JWT_SECRET=$NewSecret" } else { $_ } })
  } else {
    $EnvLines += "JWT_SECRET=$NewSecret"
  }
  Set-Content -Path $EnvFile -Value $EnvLines -Encoding ASCII
  Write-Host 'Generated a unique JWT_SECRET in server/.env.' -ForegroundColor Green
}

$DockerAvailable = [bool](Get-Command docker -ErrorAction SilentlyContinue)
if ($DockerAvailable) {
  try {
    docker compose version | Out-Null
    Write-Host 'Starting PostgreSQL with Docker Compose...' -ForegroundColor Cyan
    Push-Location $Root
    docker compose up -d postgres
    Pop-Location
    $Ready = $false
    for ($i = 0; $i -lt 30; $i++) {
      $Health = docker inspect --format='{{.State.Health.Status}}' civicconnect-postgres 2>$null
      if ($Health -eq 'healthy') { $Ready = $true; break }
      Start-Sleep -Seconds 2
    }
    if (-not $Ready) { Write-Host 'PostgreSQL did not report healthy in time. Check Docker Desktop and try again.' -ForegroundColor Red; exit 1 }
  } catch {
    Write-Host 'Could not start the Docker database. Install/start Docker Desktop or configure a local PostgreSQL database, then retry.' -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host 'Docker was not found. Make sure PostgreSQL is installed and running, and DATABASE_URL in server/.env is correct.' -ForegroundColor Yellow
  $Continue = Read-Host 'Continue with the configured PostgreSQL URL? (y/n)'
  if ($Continue -notin @('y','Y','yes','YES')) { exit 0 }
}

Write-Host 'Installing backend packages...' -ForegroundColor Cyan
Push-Location $Server
npm install
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Host 'Backend package installation failed.' -ForegroundColor Red; exit 1 }
Write-Host 'Applying database schema...' -ForegroundColor Cyan
npm run db:migrate
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Host 'Database migration failed. Check server/.env and PostgreSQL.' -ForegroundColor Red; exit 1 }
Write-Host 'Creating demo accounts and sample reports...' -ForegroundColor Cyan
npm run db:seed
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Host 'Database seeding failed.' -ForegroundColor Red; exit 1 }
Pop-Location

Write-Host 'Installing frontend packages...' -ForegroundColor Cyan
Push-Location $Client
npm install
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Host 'Frontend package installation failed.' -ForegroundColor Red; exit 1 }
Pop-Location

$ServerCommand = "Set-Location -LiteralPath '$Server'; npm run dev"
$ClientCommand = "Set-Location -LiteralPath '$Client'; npm run dev"
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoExit','-ExecutionPolicy','Bypass','-Command',$ServerCommand)
Start-Sleep -Seconds 2
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoExit','-ExecutionPolicy','Bypass','-Command',$ClientCommand)
Start-Sleep -Seconds 3
Start-Process 'http://localhost:5173'
Write-Host ''
Write-Host 'CivicConnect AI is starting at http://localhost:5173' -ForegroundColor Green
Write-Host 'API health check: http://localhost:4000/api/health' -ForegroundColor Green
Write-Host 'Demo password: Demo@12345 (see README for demo emails)' -ForegroundColor Yellow
Write-Host 'To enable real AI classification, add GEMINI_API_KEY in server/.env and restart the backend.' -ForegroundColor Yellow

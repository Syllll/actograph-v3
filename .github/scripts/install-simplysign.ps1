# Install SimplySign Desktop (Certum) on a GitHub Actions Windows runner.
# Pinned MSI version + SHA-256 checksum for reproducibility.
# Exits non-zero on any failure so the CI fails rather than producing unsigned artifacts.
[CmdletBinding()]
param(
    [string]$InstallerDir = "$env:RUNNER_TEMP\simplysign",
    # Pinned version (see https://files.certum.eu/software/SimplySignDesktop/Windows/).
    [string]$Version = "9.4.2.86",
    [string]$ExpectedChecksum = "0f8f386484e2c30882dae35961e662fdbfc23e305a5ca3639ca586b68a92bd83"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"  # speed up Invoke-WebRequest

$InstallerName = "SimplySignDesktop-$Version-64-bit-en.msi"
$DownloadUrl = "https://files.certum.eu/software/SimplySignDesktop/Windows/$Version/$InstallerName"
$InstallerPath = Join-Path $InstallerDir $InstallerName
$InstallPath = "C:\Program Files\Certum\SimplySign Desktop"
$LogPath = Join-Path $InstallerDir "install.log"

Write-Host "=== INSTALLING SIMPLYSIGN DESKTOP (v$Version) ==="

if (-not (Test-Path $InstallerDir)) {
    New-Item -ItemType Directory -Force -Path $InstallerDir | Out-Null
}

# Download (with retries) unless a valid cached copy is present.
$needDownload = $true
if (Test-Path $InstallerPath) {
    $actual = (Get-FileHash -Path $InstallerPath -Algorithm SHA256).Hash.ToLower()
    if ($actual -eq $ExpectedChecksum) {
        Write-Host "Cached MSI found with matching checksum; skipping download."
        $needDownload = $false
    } else {
        Write-Host "Cached MSI checksum mismatch; re-downloading."
        Remove-Item $InstallerPath -Force
    }
}

if ($needDownload) {
    $attempt = 0
    $maxAttempts = 4
    while ($attempt -lt $maxAttempts) {
        $attempt++
        try {
            Write-Host "Downloading SimplySign Desktop MSI (attempt $attempt/$maxAttempts)..."
            Invoke-WebRequest -Uri $DownloadUrl -OutFile $InstallerPath -TimeoutSec 600
            break
        } catch {
            Write-Host "Download attempt $attempt failed: $($_.Exception.Message)"
            if ($attempt -eq $maxAttempts) {
                Write-Host "ERROR: Failed to download SimplySign Desktop after $maxAttempts attempts."
                exit 1
            }
            Start-Sleep -Seconds 5
        }
    }

    $actual = (Get-FileHash -Path $InstallerPath -Algorithm SHA256).Hash.ToLower()
    if ($actual -ne $ExpectedChecksum) {
        Write-Host "ERROR: MSI checksum verification failed."
        Write-Host "  Expected: $ExpectedChecksum"
        Write-Host "  Actual:   $actual"
        exit 1
    }
    Write-Host "Checksum verified."
}

$sizeMb = [math]::Round((Get-Item $InstallerPath).Length / 1MB, 1)
Write-Host "Installing SimplySign Desktop ($sizeMb MB)..."

$installArgs = "/i `"$InstallerPath`" /quiet /norestart /l*v `"$LogPath`" ALLUSERS=1 REBOOT=ReallySuppress"
$proc = Start-Process -FilePath "msiexec.exe" -ArgumentList $installArgs -Wait -NoNewWindow -PassThru

# 0 = success; 3010 = success but reboot required (suppressed, harmless for us).
if ($proc.ExitCode -notin 0, 3010) {
    Write-Host "ERROR: MSI installation returned exit code $($proc.ExitCode)."
    if (Test-Path $LogPath) {
        Write-Host "--- last 20 lines of install log ---"
        Get-Content $LogPath -Tail 20
    }
    exit 1
}
if ($proc.ExitCode -eq 3010) {
    Write-Host "MSI install returned 3010 (reboot required, suppressed); treating as success."
}

if (-not (Test-Path $InstallPath)) {
    Write-Host "ERROR: SimplySign Desktop install path not found: $InstallPath"
    exit 1
}

$exe = Join-Path $InstallPath "SimplySignDesktop.exe"
if (-not (Test-Path $exe)) {
    Write-Host "ERROR: SimplySignDesktop.exe not found at $exe"
    exit 1
}

Write-Host "SimplySign Desktop installed successfully at $InstallPath"

# Export the executable path for downstream steps.
# Use [System.IO.File]::AppendAllText with a BOM-less UTF-8 encoder so the
# step output is never prefixed with a BOM (which would corrupt the variable
# name when GitHub Actions parses GITHUB_OUTPUT). Works on PS 5.1 and 7.
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
if ($env:GITHUB_OUTPUT) {
    [System.IO.File]::AppendAllText($env:GITHUB_OUTPUT, "SIMPLYSIGN_EXE=$exe`n", $utf8NoBom)
}
$env:SIMPLYSIGN_EXE = $exe

# Pre-configure SimplySign Desktop registry settings so the login dialog
# auto-appears and the cloud certificate stays mounted for automated signing.
[CmdletBinding()]
param([switch]$DebugMode)

$ErrorActionPreference = "Stop"

Write-Host "=== SIMPLYSIGN DESKTOP REGISTRY CONFIGURATION ==="

$RegistryPath = "HKCU:\Software\Certum\SimplySign"

# Optimal settings for unattended CI signing.
$OptimalSettings = [ordered]@{
    "ShowLoginDialogOnStart"        = 1   # auto-open login dialog on launch
    "ShowLoginDialogOnAppRequest"   = 1   # dialog appears when an app requests the card
    "RememberLastUserName"          = 0   # do NOT pre-fill username: the auth
                                          # script types it fresh each attempt, and
                                          # a pre-filled field would risk duplicating
                                          # the email when SendKeys types it again.
    "Autostart"                     = 0
    "UnregisterCertificatesOnDisconnect" = 0
    "RememberPINinCSP"              = 1
    "ForgetPINinCSPonDisconnect"    = 1
    "LangID"                        = 9   # English
}

function Test-RegistryPath { param([string]$Path) try { $null = Get-Item -Path $Path -ErrorAction Stop; return $true } catch { return $false } }

# Ensure parent keys exist.
foreach ($p in @("HKCU:\Software\Certum", $RegistryPath)) {
    if (-not (Test-RegistryPath $p)) {
        New-Item -Path $p -Force | Out-Null
        if ($DebugMode) { Write-Host "  created $p" }
    }
}

$success = 0
foreach ($name in $OptimalSettings.Keys) {
    try {
        Set-ItemProperty -Path $RegistryPath -Name $name -Value $OptimalSettings[$name] -Type DWord -ErrorAction Stop
        $success++
    } catch {
        Write-Host "ERROR: failed to set $name : $($_.Exception.Message)"
    }
}

if ($success -ne $OptimalSettings.Count) {
    Write-Host "ERROR: only $success/$($OptimalSettings.Count) registry settings applied."
    exit 1
}

Write-Host "Registry configuration applied ($success/$($OptimalSettings.Count) settings)."

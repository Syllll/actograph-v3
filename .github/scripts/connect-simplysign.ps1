# Authenticate SimplySign Desktop via TOTP injection, then verify the cloud
# code-signing certificate is mounted in the Windows store and export its
# SHA-1 thumbprint for electron-builder (signtool /sha1).
#
# Exits non-zero if authentication or certificate mounting fails, so the CI
# fails rather than producing unsigned Windows artifacts.
[CmdletBinding()]
param(
    [string]$OtpUri   = $env:CERTUM_OTP_URI,
    [string]$UserId   = $env:CERTUM_USERNAME,
    [string]$ExePath  = $env:SIMPLYSIGN_EXE,
    [string]$SubjectFilter = $env:CERTUM_SUBJECT_FILTER,  # e.g. "Symalgo"
    [int]$MaxAuthAttempts = 3,
    [int]$CertWaitSeconds  = 45
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

if (-not $OtpUri)  { Write-Host "ERROR: CERTUM_OTP_URI is not set."; exit 1 }
if (-not $UserId)  { Write-Host "ERROR: CERTUM_USERNAME is not set."; exit 1 }
if (-not $ExePath) { $ExePath = "C:\Program Files\Certum\SimplySign Desktop\SimplySignDesktop.exe" }
if (-not $SubjectFilter) { $SubjectFilter = "Symalgo" }

Write-Host "=== SIMPLYSIGN TOTP AUTHENTICATION ==="
Write-Host "User: $UserId"
Write-Host "Exe : $ExePath"
if (-not (Test-Path $ExePath)) { Write-Host "ERROR: SimplySignDesktop.exe not found at $ExePath"; exit 1 }

# --- Parse otpauth URI -------------------------------------------------------
$uri = [Uri]$OtpUri
try {
    $q = [System.Web.HttpUtility]::ParseQueryString($uri.Query)
} catch {
    $q = @{}
    foreach ($part in $uri.Query.TrimStart('?') -split '&') {
        $kv = $part -split '=', 2
        if ($kv.Count -eq 2) { $q[$kv[0]] = [Uri]::UnescapeDataString($kv[1]) }
    }
}
$Base32    = $q['secret']
$Digits    = if ($q['digits'])   { [int]$q['digits'] }   else { 6 }
$Period    = if ($q['period'])   { [int]$q['period'] }   else { 30 }
$Algorithm = if ($q['algorithm']) { $q['algorithm'].ToUpper() } else { 'SHA256' }
if (-not $Base32) { Write-Host "ERROR: otpauth URI missing 'secret'."; exit 1 }
if ($Algorithm -notin @('SHA1','SHA256','SHA512')) { Write-Host "ERROR: unsupported algorithm $Algorithm"; exit 1 }
Write-Host "TOTP params: digits=$Digits period=$Period algorithm=$Algorithm"

# --- Inline C# TOTP generator ----------------------------------------------
Add-Type -Language CSharp @"
using System;
using System.Security.Cryptography;
public static class Totp
{
    private const string B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static byte[] Base32Decode(string s)
    {
        s = s.TrimEnd('=').ToUpperInvariant();
        int byteCount = s.Length * 5 / 8;
        byte[] bytes = new byte[byteCount];
        int bitBuffer = 0, bitsLeft = 0, idx = 0;
        foreach (char c in s)
        {
            int val = B32.IndexOf(c);
            if (val < 0) throw new ArgumentException("Invalid Base32 char: " + c);
            bitBuffer = (bitBuffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) { bytes[idx++] = (byte)(bitBuffer >> (bitsLeft - 8)); bitsLeft -= 8; }
        }
        return bytes;
    }
    private static HMAC GetHmac(string algorithm, byte[] key)
    {
        switch (algorithm.ToUpper())
        {
            case "SHA1":   return new HMACSHA1(key);
            case "SHA256": return new HMACSHA256(key);
            case "SHA512": return new HMACSHA512(key);
            default: throw new ArgumentException("Unsupported: " + algorithm);
        }
    }
    public static string Now(string secret, int digits, int period, string algorithm = "SHA256")
    {
        byte[] key = Base32Decode(secret);
        long counter = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / period;
        byte[] cnt = BitConverter.GetBytes(counter);
        if (BitConverter.IsLittleEndian) Array.Reverse(cnt);
        byte[] hash;
        using (var hmac = GetHmac(algorithm, key)) { hash = hmac.ComputeHash(cnt); }
        int offset = hash[hash.Length - 1] & 0x0F;
        int binary =
            ((hash[offset] & 0x7F) << 24) |
            ((hash[offset + 1] & 0xFF) << 16) |
            ((hash[offset + 2] & 0xFF) << 8) |
            (hash[offset + 3] & 0xFF);
        int otp = binary % (int)Math.Pow(10, digits);
        return otp.ToString(new string('0', digits));
    }
}
"@

function Get-TotpCode {
    param([string]$Secret, [int]$Digits, [int]$Period, [string]$Algorithm)
    [Totp]::Now($Secret, $Digits, $Period, $Algorithm)
}

function Find-CodeSigningCert {
    param([string]$SubjectFilter)
    $certs = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert -ErrorAction SilentlyContinue
    if (-not $certs) { return $null }
    if ($SubjectFilter) {
        # Only accept a certificate whose subject matches the expected org.
        # NEVER fall back to an unrelated code-signing cert that might happen
        # to pre-exist in the runner's store (would sign with the wrong key).
        return ($certs | Where-Object { $_.Subject -match [regex]::Escape($SubjectFilter) } | Select-Object -First 1)
    }
    return ($certs | Select-Object -First 1)
}

# Kill any stale instance (a running instance may not show the login dialog).
$existing = Get-Process -Name "SimplySignDesktop" -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Stopping existing SimplySign Desktop process..."
    $existing | ForEach-Object { try { $_.Kill() } catch {} }
    Start-Sleep -Seconds 2
}

# --- Authenticate (retry the whole login sequence) --------------------------
$authenticated = $false
$cert = $null

for ($attempt = 1; $attempt -le $MaxAuthAttempts; $attempt++) {
    Write-Host ""
    Write-Host "--- Authentication attempt $attempt/$MaxAuthAttempts ---"

    # Pre-check: maybe a previous attempt already mounted the cert.
    $cert = Find-CodeSigningCert -SubjectFilter $SubjectFilter
    if ($cert) {
        Write-Host "Code-signing cert already present in store (previous attempt succeeded)."
        $authenticated = $true
        break
    }

    # Stop any stale instance from a previous (failed) attempt before relaunching.
    # Done AFTER the pre-check so we never kill a process that already mounted the cert.
    $stale = Get-Process -Name "SimplySignDesktop" -ErrorAction SilentlyContinue
    if ($stale) {
        Write-Host "Stopping stale SimplySign Desktop instance before retry..."
        $stale | ForEach-Object { try { $_.Kill() } catch {} }
        Start-Sleep -Seconds 2
    }

    $proc = Start-Process -FilePath $ExePath -PassThru
    Write-Host "Launched SimplySign Desktop (PID $($proc.Id))."
    Start-Sleep -Seconds 3

    $wshell = New-Object -ComObject WScript.Shell
    $focused = $wshell.AppActivate($proc.Id)
    if (-not $focused) { $focused = $wshell.AppActivate('SimplySign Desktop') }
    for ($i = 0; (-not $focused) -and ($i -lt 12); $i++) {
        Start-Sleep -Milliseconds 500
        $focused = $wshell.AppActivate($proc.Id) -or $wshell.AppActivate('SimplySign Desktop')
    }
    if (-not $focused) {
        Write-Host "WARNING: could not focus SimplySign login window on attempt $attempt."
        continue
    }
    Start-Sleep -Milliseconds 400

    # Regenerate a fresh TOTP right before typing. If we are near the end of
    # the 30s validity window, wait for the next window to avoid submitting a
    # code that expires while SendKeys is still in flight.
    $nowEpoch = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $remainingInWindow = $Period - ($nowEpoch % $Period)
    if ($remainingInWindow -lt 5) {
        $wait = [int]$remainingInWindow + 1
        Write-Host "Only ${remainingInWindow}s left in TOTP window; waiting ${wait}s for the next window."
        Start-Sleep -Seconds $wait
    }
    $otp = Get-TotpCode -Secret $Base32 -Digits $Digits -Period $Period -Algorithm $Algorithm
    Write-Host "Injecting credentials (email -> TAB -> TOTP -> ENTER)..."

    $wshell.SendKeys($UserId)
    Start-Sleep -Milliseconds 200
    $wshell.SendKeys("{TAB}")
    Start-Sleep -Milliseconds 200
    $wshell.SendKeys($otp)
    Start-Sleep -Milliseconds 200
    $wshell.SendKeys("{ENTER}")

    # Wait for the cloud card to mount and the cert to appear in the store.
    Write-Host "Waiting up to ${CertWaitSeconds}s for the code-signing cert to mount..."
    $deadline = (Get-Date).AddSeconds($CertWaitSeconds)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 3
        $cert = Find-CodeSigningCert -SubjectFilter $SubjectFilter
        if ($cert) { break }
    }

    if ($cert) {
        $authenticated = $true
        Write-Host "Authentication succeeded; cert mounted in store."
        break
    }
    Write-Host "Cert not yet present after attempt $attempt; will retry with a fresh TOTP."
}

if (-not $authenticated -or -not $cert) {
    Write-Host "ERROR: SimplySign authentication failed after $MaxAuthAttempts attempts."
    Write-Host "No code-signing certificate is available in Cert:\CurrentUser\My."
    Write-Host "Failing the build: refusing to produce unsigned Windows artifacts."
    exit 1
}

# --- Validate and export the thumbprint -------------------------------------
$thumbprint = $cert.Thumbprint  # SHA-1, lowercase hex without separators
$subject    = $cert.Subject
$issuer     = $cert.Issuer
$notAfter   = $cert.NotAfter

Write-Host ""
Write-Host "Code-signing certificate ready:"
Write-Host "  Subject    : $subject"
Write-Host "  Issuer     : $issuer"
Write-Host "  Thumbprint : $thumbprint"
Write-Host "  NotAfter   : $notAfter"

if ($notAfter -lt (Get-Date)) {
    Write-Host "ERROR: certificate is EXPIRED ($notAfter). Refusing to sign."
    exit 1
}

# Sanity check: warn (not fail) if the cert subject does not match the expected org.
if ($SubjectFilter -and ($subject -notmatch [regex]::Escape($SubjectFilter))) {
    Write-Host "WARNING: cert subject does not contain '$SubjectFilter': $subject"
}

# Export for downstream steps (electron-builder reads WIN_CERT_SHA1 from env).
# BOM-less UTF-8 via AppendAllText so GITHUB_ENV/GITHUB_OUTPUT parsing never sees
# a leading BOM on the WIN_CERT_SHA1 line (works on PS 5.1 and 7).
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$line = "WIN_CERT_SHA1=$thumbprint"
if ($env:GITHUB_ENV) {
    [System.IO.File]::AppendAllText($env:GITHUB_ENV, "$line`n", $utf8NoBom)
}
if ($env:GITHUB_OUTPUT) {
    [System.IO.File]::AppendAllText($env:GITHUB_OUTPUT, "$line`n", $utf8NoBom)
}
$env:WIN_CERT_SHA1 = $thumbprint

Write-Host ""
Write-Host "=== SIMPLYSIGN AUTHENTICATION COMPLETE ==="

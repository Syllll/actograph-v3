#!/usr/bin/env node
// Read-only diagnostics. Never print credentials, JWTs or certificate contents.
import { createPrivateKey, sign, X509Certificate } from 'node:crypto';
import { appendFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const expectedTeam = 'JZ2M998YMV';
const expectedFingerprint = '0CA7BDE7A40516AC7FB6A5FA3B48AEA0DF65E242';
const expectedSerial = '7A53B092D1315524AFC3B4A354756681';
const credentialNames = ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID',
  'APP_STORE_CONNECT_API_KEY_ID', 'APP_STORE_CONNECT_API_ISSUER_ID'];

export function credentialMetadata(env) {
  return {
    present: Object.fromEntries(credentialNames.map((name) => [name, Boolean(env[name])])),
    surroundingWhitespace: Object.fromEntries(credentialNames.map((name) => [name,
      typeof env[name] === 'string' && env[name] !== env[name].trim()])),
    teamMatchesDesktopSigner: env.APPLE_TEAM_ID === expectedTeam,
    appPasswordFormatValid: /^(?:[a-z]{16}|[a-z]{4}(?:-[a-z]{4}){3})$/i.test(env.APPLE_APP_SPECIFIC_PASSWORD ?? ''),
    apiKeyIdFormatValid: /^[A-Z0-9]{10}$/.test(env.APP_STORE_CONNECT_API_KEY_ID ?? ''),
    apiIssuerUuidFormatValid: /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(env.APP_STORE_CONNECT_API_ISSUER_ID ?? ''),
    apiIssuerLooksLikeTeamId: /^[A-Z0-9]{10}$/.test(env.APP_STORE_CONNECT_API_ISSUER_ID ?? ''),
  };
}

export async function issuerCertificateMetadata(env, fetchImpl = fetch, now = Date.now) {
  let privateKey;
  try {
    privateKey = createPrivateKey(Buffer.from(env.APP_STORE_CONNECT_API_KEY_BASE64 ?? '', 'base64'));
    if (privateKey.asymmetricKeyType !== 'ec' || privateKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
      return { apiKeyParseValid: false, requestMade: false };
    }
  } catch {
    return { apiKeyParseValid: false, requestMade: false };
  }
  if (!env.APP_STORE_CONNECT_API_KEY_ID || !env.APP_STORE_CONNECT_API_ISSUER_ID) {
    return { apiKeyParseValid: true, credentialsPresent: false, requestMade: false };
  }
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const issued = Math.floor(now() / 1000);
  const input = `${encode({ alg: 'ES256', kid: env.APP_STORE_CONNECT_API_KEY_ID, typ: 'JWT' })}.${encode({
    iss: env.APP_STORE_CONNECT_API_ISSUER_ID, iat: issued, exp: issued + 120, aud: 'appstoreconnect-v1',
  })}`;
  const signature = sign('sha256', Buffer.from(input), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  const url = new URL('https://api.appstoreconnect.apple.com/v1/certificates');
  // Target the known public signer directly; a broad G2 type query can fail upstream.
  url.searchParams.set('filter[serialNumber]', expectedSerial);
  url.searchParams.set('fields[certificates]', 'certificateContent');
  url.searchParams.set('limit', '200');
  let response;
  try {
    response = await fetchImpl(url, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${input}.${signature.toString('base64url')}`, Accept: 'application/json' } });
  } catch {
    return { apiKeyParseValid: true, requestMade: true, transportFailed: true, teamMapping: 'unknown' };
  }
  let body;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok || !Array.isArray(body?.data)) {
    return { apiKeyParseValid: true, requestMade: true, httpStatus: response.status, teamMapping: 'unknown',
      agreementRejected: (body?.errors ?? []).some((error) => String(error?.code ?? '').includes('REQUIRED_AGREEMENTS')) };
  }
  let readable = 0, teamMatches = 0, signingCertificateMatches = 0;
  for (const record of body.data) {
    try {
      const certificate = new X509Certificate(Buffer.from(record.attributes.certificateContent, 'base64'));
      readable += 1;
      const correctTeam = certificate.subject.split('\n').includes(`OU=${expectedTeam}`);
      if (correctTeam) teamMatches += 1;
      if (correctTeam && certificate.fingerprint.replace(/:/g, '') === expectedFingerprint) signingCertificateMatches += 1;
    } catch { /* Malformed or unavailable public certificate is not proof of another team. */ }
  }
  return { apiKeyParseValid: true, requestMade: true, httpStatus: response.status,
    returnedCertificateCount: body.data.length, readableCertificateCount: readable,
    expectedTeamPresent: teamMatches > 0, signingCertificatePresent: signingCertificateMatches > 0,
    moreCertificatePages: Boolean(body.links?.next), teamMapping: teamMatches > 0 ? 'confirmed' : 'unknown' };
}

export function recentSubmissionMetadata(value, since) {
  const start = Date.parse(since);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(since) || !Number.isFinite(start) ||
    new Date(start).toISOString().replace('.000Z', 'Z') !== since || !Array.isArray(value?.history)) {
    throw new Error('Invalid filtered history input');
  }
  if (value.history.some((record) => !record || typeof record.name !== 'string' ||
    typeof record.createdDate !== 'string' || !Number.isFinite(Date.parse(record.createdDate)))) {
    throw new Error('Inconclusive submission history schema');
  }
  const recent = value.history.filter((record) => Date.parse(record.createdDate) >= start &&
    /^ActoGraph(?:[ ._-]|$)/i.test(record.name));
  return { since, recentActographCount: recent.length, truncated: recent.length > 10,
    submissions: recent.slice(0, 10).map((record) => ({
      date: new Date(record.createdDate).toISOString(),
      id: /^[a-f0-9-]{36}$/i.test(record.id ?? '') ? record.id : 'unavailable',
      name: 'ActoGraph',
      status: ['Accepted', 'In Progress', 'Invalid', 'Rejected'].includes(record.status) ? record.status : 'unknown',
    })) };
}

async function main() {
  if (process.argv[2] === '--metadata') {
    const metadata = credentialMetadata(process.env);
    console.log(JSON.stringify(metadata));
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT,
      `team_matches=${metadata.teamMatchesDesktopSigner}\n`);
  } else if (process.argv[2] === '--certificates') {
    const metadata = await issuerCertificateMetadata(process.env);
    console.log(JSON.stringify(metadata));
    if (!metadata.signingCertificatePresent) process.exitCode = 1;
  } else if (process.argv[2] === '--history') {
    console.log(JSON.stringify(recentSubmissionMetadata(JSON.parse(await readFile(process.argv[3], 'utf8')), process.argv[4])));
  } else {
    throw new Error('Choose --metadata, --certificates or --history');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('Diagnostic failed; private response details were withheld.'); process.exitCode = 1; });
}

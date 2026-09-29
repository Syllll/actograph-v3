#!/usr/bin/env node
// Submit the exact IPA build produced by a production tag to App Review.
// The App Store listing and its required compliance/review details must exist.

import { readFile } from 'node:fs/promises';
import { createPrivateKey, sign } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const bundleId = 'com.symalgo-tech.actograph';
const appStoreId = '1320016064';
const baseUrl = 'https://api.appstoreconnect.apple.com';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ref = (type, id) => ({ type, id });

export function iosBuildNumber(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Invalid iOS version: ${version}`);
  const [major, minor, patch] = match.slice(1).map(Number);
  if (minor >= 100 || patch >= 100) throw new Error('iOS minor and patch must be below 100');
  const number = major * 10000 + minor * 100 + patch;
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error('Invalid iOS build number');
  return String(number);
}

function token(keyId, issuerId, privateKey, now) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'ES256', kid: keyId, typ: 'JWT' });
  const payload = encode({ iss: issuerId, iat: Math.floor(now() / 1000), exp: Math.floor(now() / 1000) + 600, aud: 'appstoreconnect-v1' });
  const input = `${header}.${payload}`;
  const signature = sign('sha256', Buffer.from(input), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${input}.${signature.toString('base64url')}`;
}

function apiError(method, url, status, body) {
  const details = (body?.errors || []).map((error) => `${error.code || error.title}: ${error.detail || error.title}`).join('; ');
  return new Error(`${method} ${url.pathname} failed (${status}): ${details || JSON.stringify(body)}`);
}

export async function submitIosRelease({ version, keyId, issuerId, keyPem, releaseNotes, fetchImpl = fetch, sleep = wait, now = Date.now, pollMinutes = 45, apiBaseUrl = baseUrl }) {
  const buildNumber = iosBuildNumber(version);
  if (!keyId || !issuerId || !keyPem) throw new Error('App Store Connect API credentials are required');
  if (!releaseNotes || typeof releaseNotes !== 'object' || Array.isArray(releaseNotes)) {
    throw new Error('App Store release notes must be a locale-to-text object');
  }
  const privateKey = createPrivateKey(keyPem);
  const api = async (method, path, body) => {
    const url = new URL(path, apiBaseUrl);
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${token(keyId, issuerId, privateKey, now)}`,
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const raw = await response.text();
      let result;
      try { result = raw ? JSON.parse(raw) : {}; } catch { result = { raw }; }
      if (response.ok) return result;
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw apiError(method, url, response.status, result);
    }
  };
  const query = (path, params) => {
    const url = new URL(path, apiBaseUrl);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return `${url.pathname}${url.search}`;
  };

  const apps = await api('GET', query('/v1/apps', { 'filter[bundleId]': bundleId, limit: '2' }));
  if (apps.data?.length !== 1 || apps.data[0].attributes?.bundleId !== bundleId || apps.data[0].id !== appStoreId) {
    throw new Error(`Expected existing App Store app ${appStoreId} with bundle ID ${bundleId}`);
  }
  const appId = apps.data[0].id;
  console.log(`Waiting for iOS ${version} (${buildNumber}) to finish Apple processing`);
  const deadline = now() + pollMinutes * 60_000;
  let build;
  while (now() < deadline) {
    const preReleaseVersions = await api('GET', query('/v1/preReleaseVersions', {
      'filter[app]': appId,
      'filter[version]': version,
      'filter[platform]': 'IOS',
      limit: '2',
    }));
    if ((preReleaseVersions.data || []).length > 1) throw new Error(`Several iOS prerelease versions match ${version}`);
    const preReleaseVersion = preReleaseVersions.data?.[0];
    if (!preReleaseVersion) {
      await sleep(30_000);
      continue;
    }
    const builds = await api('GET', query('/v1/builds', {
      'filter[app]': appId,
      'filter[version]': buildNumber,
      'filter[preReleaseVersion]': preReleaseVersion.id,
      'filter[buildAudienceType]': 'APP_STORE_ELIGIBLE',
      limit: '2',
    }));
    if ((builds.data || []).length > 1) throw new Error(`Several iOS builds match ${version} (${buildNumber})`);
    build = builds.data?.[0];
    if (build?.attributes?.processingState === 'VALID') break;
    if (['FAILED', 'INVALID'].includes(build?.attributes?.processingState)) {
      throw new Error(`Apple rejected processing for iOS ${version} (${buildNumber}): ${build.attributes.processingState}`);
    }
    await sleep(30_000);
  }
  if (build?.attributes?.processingState !== 'VALID') throw new Error(`Timed out waiting for Apple to process iOS ${version} (${buildNumber})`);

  const versions = await api('GET', query(`/v1/apps/${appId}/appStoreVersions`, {
    'filter[versionString]': version, 'filter[platform]': 'IOS', limit: '2',
  }));
  if ((versions.data || []).length > 1) throw new Error(`Several App Store versions match iOS ${version}`);
  let storeVersion = versions.data?.[0];
  if (!storeVersion) {
    const created = await api('POST', '/v1/appStoreVersions', {
      data: {
        type: 'appStoreVersions',
        attributes: { platform: 'IOS', versionString: version, releaseType: 'AFTER_APPROVAL' },
        relationships: { app: { data: ref('apps', appId) } },
      },
    });
    storeVersion = created.data;
    console.log(`Created App Store version ${version}`);
  }
  if (!storeVersion?.id || storeVersion.attributes?.versionString !== version || storeVersion.attributes?.platform !== 'IOS') {
    throw new Error('App Store Connect returned an unexpected iOS version');
  }
  const versionId = storeVersion.id;
  const state = storeVersion.attributes.appStoreState || storeVersion.attributes.appVersionState;
  const currentBuild = await api('GET', `/v1/appStoreVersions/${versionId}/relationships/build`);
  if (currentBuild.data && currentBuild.data.id !== build.id) {
    throw new Error(`App Store version ${version} already points to a different build (${currentBuild.data.id})`);
  }
  const submittedStates = new Set(['WAITING_FOR_REVIEW', 'IN_REVIEW', 'PENDING_APPLE_RELEASE', 'PROCESSING_FOR_APP_STORE', 'PROCESSING_FOR_DISTRIBUTION', 'READY_FOR_SALE', 'READY_FOR_DISTRIBUTION']);
  if (submittedStates.has(state)) {
    if (currentBuild.data?.id !== build.id || storeVersion.attributes.releaseType !== 'AFTER_APPROVAL') {
      throw new Error(`iOS ${version} is already ${state} but its build or release type differs`);
    }
    console.log(`iOS ${version} is already ${state} with automatic release after approval`);
    return { appId, versionId, buildId: build.id, state };
  }
  if (!['PREPARE_FOR_SUBMISSION', 'READY_FOR_REVIEW'].includes(state)) {
    throw new Error(`App Store version ${version} cannot be submitted from state ${state}`);
  }
  if (storeVersion.attributes.releaseType !== 'AFTER_APPROVAL') {
    await api('PATCH', `/v1/appStoreVersions/${versionId}`, {
      data: { type: 'appStoreVersions', id: versionId, attributes: { releaseType: 'AFTER_APPROVAL' } },
    });
  }
  if (!currentBuild.data) {
    await api('PATCH', `/v1/appStoreVersions/${versionId}/relationships/build`, { data: ref('builds', build.id) });
  }

  const localizations = await api('GET', query(`/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`, { limit: '200' }));
  if (!localizations.data?.length || localizations.links?.next) {
    throw new Error('App Store version localizations are missing or exceed one page; complete the initial listing setup');
  }
  for (const localization of localizations.data) {
    const locale = localization.attributes?.locale;
    const whatsNew = releaseNotes[locale];
    if (typeof whatsNew !== 'string' || !whatsNew.trim() || whatsNew.length > 4000) {
      throw new Error(`Missing or invalid release notes for App Store locale ${locale}`);
    }
  }
  for (const localization of localizations.data) {
    const whatsNew = releaseNotes[localization.attributes.locale];
    await api('PATCH', `/v1/appStoreVersionLocalizations/${localization.id}`, {
      data: { type: 'appStoreVersionLocalizations', id: localization.id, attributes: { whatsNew } },
    });
  }

  const submissions = await api('GET', query(`/v1/apps/${appId}/reviewSubmissions`, { limit: '200' }));
  if (submissions.links?.next) throw new Error('Too many review submissions to safely identify the current version');
  let review;
  for (const candidate of submissions.data || []) {
    if (!['READY_FOR_REVIEW', 'WAITING_FOR_REVIEW', 'IN_REVIEW'].includes(candidate.attributes?.state)) continue;
    const items = await api('GET', query(`/v1/reviewSubmissions/${candidate.id}/items`, { limit: '200' }));
    if (items.links?.next) throw new Error('Too many items in a review submission');
    const matchingItem = (items.data || []).find((item) => item.relationships?.appStoreVersion?.data?.id === versionId);
    if (matchingItem) {
      review = candidate;
      break;
    }
  }
  if (review?.attributes?.state === 'READY_FOR_REVIEW') {
    await api('PATCH', `/v1/reviewSubmissions/${review.id}`, {
      data: { type: 'reviewSubmissions', id: review.id, attributes: { submitted: true } },
    });
  } else if (!review) {
    const created = await api('POST', '/v1/reviewSubmissions', {
      data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: { data: ref('apps', appId) } } },
    });
    review = created.data;
    if (!review?.id) throw new Error('Apple did not return a review submission ID');
    await api('POST', '/v1/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: ref('reviewSubmissions', review.id) },
          appStoreVersion: { data: ref('appStoreVersions', versionId) },
        },
      },
    });
    await api('PATCH', `/v1/reviewSubmissions/${review.id}`, {
      data: { type: 'reviewSubmissions', id: review.id, attributes: { submitted: true } },
    });
  }
  console.log(`Submitted iOS ${version} (${buildNumber}) to App Review; Apple will release it after approval`);
  return { appId, versionId, buildId: build.id, reviewId: review.id };
}

async function main() {
  const version = process.argv[2];
  if (!version) throw new Error('Usage: node scripts/submit-ios-release.mjs VERSION');
  const keyId = process.env.APP_STORE_CONNECT_API_KEY_ID;
  const issuerId = process.env.APP_STORE_CONNECT_API_ISSUER_ID;
  const keyPath = process.env.APP_STORE_CONNECT_API_KEY_PATH;
  if (!keyPath) throw new Error('APP_STORE_CONNECT_API_KEY_PATH is required');
  const notesPath = new URL('../mobile/app-store-release-notes.json', import.meta.url);
  const [keyPem, rawNotes] = await Promise.all([readFile(keyPath, 'utf8'), readFile(notesPath, 'utf8')]);
  await submitIosRelease({ version, keyId, issuerId, keyPem, releaseNotes: JSON.parse(rawNotes) });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}

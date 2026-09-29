import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { iosBuildNumber, submitIosRelease } from './submit-ios-release.mjs';

const keyPem = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({ type: 'pkcs8', format: 'pem' });
const notes = { 'fr-FR': 'Corrections et améliorations.' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

test('production release submits the exact processed build and enables automatic release', async () => {
  const calls = [];
  let polls = 0;
  const fetchImpl = async (url, options) => {
    const call = { method: options.method, path: url.pathname, query: url.searchParams, body: options.body && JSON.parse(options.body) };
    calls.push(call);
    if (call.path === '/v1/apps') return json({ data: [{ id: '1320016064', attributes: { bundleId: 'com.symalgo-tech.actograph' } }] });
    if (call.path === '/v1/preReleaseVersions') {
      assert.equal(call.query.get('filter[app]'), '1320016064');
      assert.equal(call.query.get('filter[version]'), '1.3.2');
      assert.equal(call.query.get('filter[platform]'), 'IOS');
      return json({ data: [{ id: 'prerelease-1' }] });
    }
    if (call.path === '/v1/builds') {
      assert.equal(call.query.get('filter[version]'), '10302');
      assert.equal(call.query.get('filter[preReleaseVersion]'), 'prerelease-1');
      return json({ data: ++polls === 1 ? [] : [{ id: 'build-1', attributes: { processingState: 'VALID' } }] });
    }
    if (call.path === '/v1/apps/1320016064/appStoreVersions') return json({ data: [] });
    if (call.path === '/v1/appStoreVersions' && call.method === 'POST') {
      assert.equal(call.body.data.attributes.releaseType, 'AFTER_APPROVAL');
      return json({ data: { id: 'version-1', attributes: { versionString: '1.3.2', platform: 'IOS', appStoreState: 'PREPARE_FOR_SUBMISSION', releaseType: 'AFTER_APPROVAL' } } }, 201);
    }
    if (call.path === '/v1/appStoreVersions/version-1/relationships/build' && call.method === 'GET') return json({ data: null });
    if (call.path === '/v1/appStoreVersions/version-1/relationships/build' && call.method === 'PATCH') {
      assert.equal(call.body.data.id, 'build-1');
      return new Response(null, { status: 204 });
    }
    if (call.path === '/v1/appStoreVersions/version-1/appStoreVersionLocalizations') return json({ data: [{ id: 'loc-1', attributes: { locale: 'fr-FR' } }] });
    if (call.path === '/v1/appStoreVersionLocalizations/loc-1') {
      assert.equal(call.body.data.attributes.whatsNew, notes['fr-FR']);
      return json({ data: { id: 'loc-1' } });
    }
    if (call.path === '/v1/apps/1320016064/reviewSubmissions') return json({ data: [] });
    if (call.path === '/v1/reviewSubmissions' && call.method === 'POST') return json({ data: { id: 'review-1' } }, 201);
    if (call.path === '/v1/reviewSubmissionItems' && call.method === 'POST') {
      assert.equal(call.body.data.relationships.appStoreVersion.data.id, 'version-1');
      return json({ data: { id: 'item-1' } }, 201);
    }
    if (call.path === '/v1/reviewSubmissions/review-1' && call.method === 'PATCH') {
      assert.equal(call.body.data.attributes.submitted, true);
      return json({ data: { id: 'review-1' } });
    }
    throw new Error(`Unexpected API call: ${call.method} ${call.path}`);
  };
  const result = await submitIosRelease({ version: '1.3.2', keyId: 'KEY', issuerId: 'ISSUER', keyPem, releaseNotes: notes, fetchImpl, sleep: async () => {}, now: () => 1_000_000, pollMinutes: 1 });
  assert.equal(result.reviewId, 'review-1');
  assert.equal(polls, 2);
  assert.equal(calls.at(-1).path, '/v1/reviewSubmissions/review-1');
});

test('never replaces a build already attached to an App Store version', async () => {
  const fetchImpl = async (url, options) => {
    if (url.pathname === '/v1/apps') return json({ data: [{ id: '1320016064', attributes: { bundleId: 'com.symalgo-tech.actograph' } }] });
    if (url.pathname === '/v1/preReleaseVersions') return json({ data: [{ id: 'prerelease-1' }] });
    if (url.pathname === '/v1/builds') return json({ data: [{ id: 'new-build', attributes: { processingState: 'VALID' } }] });
    if (url.pathname === '/v1/apps/1320016064/appStoreVersions') return json({ data: [{ id: 'version-1', attributes: { versionString: '1.3.2', platform: 'IOS', appStoreState: 'PREPARE_FOR_SUBMISSION', releaseType: 'AFTER_APPROVAL' } }] });
    if (url.pathname === '/v1/appStoreVersions/version-1/relationships/build') return json({ data: { id: 'old-build' } });
    throw new Error(`Unexpected mutation: ${options.method} ${url.pathname}`);
  };
  await assert.rejects(submitIosRelease({ version: '1.3.2', keyId: 'KEY', issuerId: 'ISSUER', keyPem, releaseNotes: notes, fetchImpl, now: () => 1_000_000 }), /different build/);
});

test('version and build-number validation prevents collisions', () => {
  assert.equal(iosBuildNumber('0.1.23'), '123');
  assert.throws(() => iosBuildNumber('0.0.100'), /below 100/);
  assert.throws(() => iosBuildNumber('1.100.0'), /below 100/);
  assert.throws(() => iosBuildNumber('1.2.3-beta'), /Invalid iOS version/);
});

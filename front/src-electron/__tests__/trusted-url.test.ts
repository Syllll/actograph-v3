import {
  isTrustedAppUrl,
  isSafeExternalUrl,
  isTrustedCloudUrl,
} from '../trusted-url';

test('only the actual file entry can open privileged windows', () => {
  const entry = 'file:///Applications/Actograph/index.html';
  expect(isTrustedAppUrl(`${entry}?serverPort=3236#/popup/video`, entry)).toBe(
    true
  );
  for (const url of [
    'data:text/html,hello',
    'file:///tmp/evil.html',
    'file:///Applications/Actograph/../evil.html',
    'https://evil.test',
    'about:blank',
  ]) {
    expect(isTrustedAppUrl(url, entry)).toBe(false);
  }
});
test('accepts dev pop-outs on the application origin', () => {
  expect(
    isTrustedAppUrl(
      'http://localhost:8481/#/popup/video',
      'http://localhost:8481'
    )
  ).toBe(true);
  expect(
    isTrustedAppUrl('http://localhost:8482', 'http://localhost:8481')
  ).toBe(false);
});
test('limits external links and cloud forwarding', () => {
  expect(isSafeExternalUrl('https://actograph.io')).toBe(true);
  expect(isSafeExternalUrl('file:///tmp/a')).toBe(false);
  expect(isTrustedCloudUrl('https://actograph.io/api/auth-tokens')).toBe(true);
  for (const url of [
    'http://actograph.io/api/a',
    'https://evil.test/api/a',
    'https://actograph.io.evil.test/api/a',
    'https://actograph.io/api/../../private',
    'https://actograph.io/private',
    'https://user@actograph.io/api/a',
  ]) {
    expect(isTrustedCloudUrl(url)).toBe(false);
  }
});

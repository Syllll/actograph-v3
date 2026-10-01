import { desktopFetch } from './desktop-fetch';

const originalMode = process.env.MODE;
const originalProd = process.env.PROD;
afterEach(() => {
  if (originalMode === undefined) delete process.env.MODE;
  else process.env.MODE = originalMode;
  if (originalProd === undefined) delete process.env.PROD;
  else process.env.PROD = originalProd;
  delete (globalThis as any).window;
});

test('forwards JSON cloud requests and reconstructs their HTTP response', async () => {
  process.env.MODE = 'electron';
  process.env.PROD = 'true';
  const invoke = jest.fn(async () => ({
    status: 200,
    headers: [['content-type', 'application/json']],
    body: new TextEncoder().encode('{"value":"token"}').buffer,
  }));
  (globalThis as any).window = { api: { invoke } };
  const response = await desktopFetch('https://actograph.io/api/auth-tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"login":"user"}',
  });
  expect(await response.json()).toEqual({ value: 'token' });
  const request = invoke.mock.calls[0] as unknown as [
    string,
    { headers: Record<string, string>; body: ArrayBuffer }
  ];
  expect(request[0]).toBe('cloud-request');
  expect(request[1].headers['content-type']).toBe('application/json');
  expect(new TextDecoder().decode(request[1].body)).toBe('{"login":"user"}');
});

test('preserves multipart bodies and headers for cloud chronicle uploads', async () => {
  process.env.MODE = 'electron';
  process.env.PROD = 'true';
  const invoke = jest.fn(async () => ({
    status: 204,
    headers: [],
    body: new ArrayBuffer(0),
  }));
  (globalThis as any).window = { api: { invoke } };
  const body = new FormData();
  body.append(
    'chronic',
    new Blob(['CHRONICLE'], { type: 'application/json' }),
    'test.jchronic'
  );
  const response = await desktopFetch(
    'https://actograph.io/api/cloud/chronic',
    { method: 'POST', headers: { 'X-Auth-Token': 'token' }, body }
  );
  expect(response.status).toBe(204);
  const request = invoke.mock.calls[0] as unknown as [
    string,
    { headers: Record<string, string>; body: ArrayBuffer }
  ];
  expect(request[1].headers['content-type']).toMatch(
    /^multipart\/form-data; boundary=/
  );
  expect(request[1].headers['x-auth-token']).toBe('token');
  expect(new TextDecoder().decode(request[1].body)).toContain('CHRONICLE');
});

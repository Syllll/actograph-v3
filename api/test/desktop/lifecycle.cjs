// Run with the Node version used to install better-sqlite3:
// node test/desktop/lifecycle.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { fork } = require('node:child_process');
const apiRoot = path.resolve(__dirname, '../..');
const bundled = process.argv.includes('--bundle');
process.env.TS_NODE_PROJECT = path.join(apiRoot, 'tsconfig.json');
require('ts-node/register/transpile-only');
const {
  BackendSupervisor,
} = require('../../../front/src-electron/backend-supervisor.ts');

(async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'actograph-desktop-'),
  );
  const token = 'desktop-integration-secret';
  const portReservation = http.createServer();
  await new Promise((resolve) =>
    portReservation.listen(0, '127.0.0.1', resolve),
  );
  const port = portReservation.address().port;
  await new Promise((resolve) => portReservation.close(resolve));
  const envFile = path.join(directory, '.env');
  await fs.writeFile(
    envFile,
    'DB_TYPE=better-sqlite3\nDB_NAME=desktop-test.db\nJWT_SECRET=desktop-test-jwt\n',
  );
  const children = [];
  const statuses = [];
  let output = '';
  const request = (pathname, suppliedToken = token, options = {}) =>
    fetch(`http://127.0.0.1:${port}${pathname}`, {
      ...options,
      headers: { 'X-Actograph-Token': suppliedToken, ...options.headers },
      signal: AbortSignal.timeout(5000),
    });
  const supervisor = new BackendSupervisor({
    port,
    spawn: () => {
      const child = fork(
        path.join(apiRoot, bundled ? 'dist/api.bundle.js' : 'src/main.ts'),
        ['--subprocess', String(port), envFile, directory],
        {
          cwd: directory,
          execArgv: bundled
            ? []
            : [
                '-r',
                require.resolve('ts-node/register/transpile-only'),
                '-r',
                require.resolve('tsconfig-paths/register'),
              ],
          env: {
            ...process.env,
            PROD: 'true',
            DEV_ELECTRON: '',
            TS_NODE_PROJECT: path.join(apiRoot, 'tsconfig.json'),
            ACTOGRAPH_DESKTOP_TOKEN: token,
            DB_TYPE: 'better-sqlite3',
            DB_NAME: 'desktop-test.db',
            JWT_SECRET: 'desktop-test-jwt',
            ADMINUSER_LOGIN: '',
            ADMINUSER_PASSWORD: '',
            ACTOGRAPH_API: 'http://127.0.0.1:1',
            ACTOGRAPH_API_PASSWORD: '',
          },
          stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        },
      );
      children.push(child);
      child.stdout.on('data', (chunk) => {
        output += chunk;
      });
      child.stderr.on('data', (chunk) => {
        output += chunk;
      });
      return child;
    },
    health: async () => {
      try {
        const response = await request('/security/say-hi');
        return response.status === 200 && (await response.text()) === 'hi';
      } catch {
        return false;
      }
    },
    notify: (status) => statuses.push(status),
    log: (message, error) => {
      output += `${message} ${error || ''}\n`;
    },
  });
  try {
    const initial = supervisor.ensureRunning();
    assert.equal(supervisor.ensureRunning(), initial);
    assert.equal(await initial, true, output);
    assert.equal(children.length, 1);
    assert.equal((await request('/security/say-hi', '')).status, 403);
    assert.equal((await request('/security/say-hi', 'wrong')).status, 403);
    const preflight = await request('/security/say-hi', '', {
      method: 'OPTIONS',
      headers: {
        Origin: 'null',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'x-actograph-token',
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'null');
    const username = await (
      await request('/security/electron/local-user-name')
    ).text();
    const login = await request('/auth-jwt/login', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: username.slice(4) }),
    });
    assert.equal(login.status, 201, await login.clone().text());
    const loginData = await login.json();
    const jwt =
      loginData.accessToken || loginData.access_token || loginData.token;
    assert.ok(jwt, `Missing JWT; login keys: ${Object.keys(loginData)}`);
    const student = await request(
      '/security/electron/activate-student',
      token,
      { method: 'POST', headers: { Authorization: `Bearer ${jwt}` } },
    );
    assert.equal(student.status, 201, await student.clone().text());
    assert.deepEqual(
      JSON.parse(
        await fs.readFile(path.join(directory, 'access.json'), 'utf8'),
      ),
      { type: 'student' },
    );
    assert.ok(statuses.includes('ready'));
    children[0].kill('SIGKILL');
    await new Promise((resolve) => children[0].once('close', resolve));
    assert.equal(await supervisor.ensureRunning(), true, output);
    assert.equal(children.length, 2);
    assert.ok(statuses.includes('backend-ready'));
    await supervisor.shutdown();
    assert.ok(
      children.every(
        (child) => child.exitCode !== null || child.signalCode !== null,
      ),
    );
    assert.equal(await supervisor.ensureRunning(), false);
    console.log(
      'Desktop integration OK: migrations, IPC readiness, session token, CORS, local login, atomic access, crash recovery and shutdown',
    );
  } catch (error) {
    console.error(output.slice(-8000));
    throw error;
  } finally {
    await supervisor.shutdown();
    await fs.rm(directory, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const jestPath = path.resolve(__dirname, '../../packages/core/node_modules/jest/bin/jest.js');
const args = [jestPath, '--config', 'jest.config.cjs', '--runInBand', ...process.argv.slice(2)];

for (const timezone of ['Europe/Paris', 'America/Toronto']) {
  process.stdout.write(`\nRunning mobile tests with TZ=${timezone}\n`);
  const result = spawnSync(process.execPath, args, {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, TZ: timezone },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}

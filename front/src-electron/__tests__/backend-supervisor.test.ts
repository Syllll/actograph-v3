import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';
import { BackendSupervisor } from '../backend-supervisor';

class FakeChild extends EventEmitter {
  pid = 42;
  connected = true;
  autoClose = true;
  send = jest.fn((_message, callback?) => {
    callback?.(null);
    if (this.autoClose) void Promise.resolve().then(() => this.exit());
    return true;
  });
  kill = jest.fn(() => {
    if (this.autoClose) void Promise.resolve().then(() => this.exit());
    return true;
  });
  listen(port = 3236) {
    this.emit('message', { type: 'backend-ready', port });
  }
  exit() {
    this.emit('exit', 1, null);
    this.emit('close', 1, null);
  }
}
const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
function setup() {
  const children: FakeChild[] = [];
  const spawn = jest.fn(() => {
    const child = new FakeChild();
    children.push(child);
    return child as unknown as ChildProcess;
  });
  const health = jest.fn(async () => true);
  const notify = jest.fn();
  const supervisor = new BackendSupervisor({
    port: 3236,
    spawn,
    health,
    notify,
    log: jest.fn(),
    startupTimeoutMs: 100,
    shutdownTimeoutMs: 20,
    killTimeoutMs: 10,
    retryDelayMs: 1,
  });
  return { supervisor, children, spawn, health, notify };
}

describe('BackendSupervisor', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shares initial startup with concurrent IPC and resume requests, and ignores stdout banners', async () => {
    const { supervisor, children, spawn, health } = setup();
    const first = supervisor.ensureRunning();
    expect(supervisor.ensureRunning()).toBe(first);
    await flush();
    children[0].emit('data', '*** App server starting... ***');
    children[0].listen(9999);
    await flush();
    expect(health).not.toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledTimes(1);
    children[0].listen();
    expect(await first).toBe(true);
    await supervisor.shutdown();
  });

  it('retries an early exit in the owning loop without another recovery loop', async () => {
    const { supervisor, children, spawn } = setup();
    const first = supervisor.ensureRunning();
    await flush();
    children[0].exit();
    await flush();
    await jest.advanceTimersByTimeAsync(1);
    expect(spawn).toHaveBeenCalledTimes(2);
    children[1].listen();
    expect(await first).toBe(true);
    await supervisor.shutdown();
  });

  it('waits for the old child to close before spawning its replacement', async () => {
    const { supervisor, children, spawn, health } = setup();
    const first = supervisor.ensureRunning();
    await flush();
    children[0].listen();
    await first;
    health.mockResolvedValue(false);
    children[0].autoClose = false;
    const recovery = supervisor.ensureRunning();
    await flush();
    await jest.advanceTimersByTimeAsync(3);
    expect(children[0].send).toHaveBeenCalledWith(
      { type: 'shutdown' },
      expect.any(Function)
    );
    expect(spawn).toHaveBeenCalledTimes(1);
    children[0].exit();
    await flush();
    health.mockResolvedValue(true);
    children[1].listen();
    expect(await recovery).toBe(true);
    await supervisor.shutdown();
  });

  it('recovers a runtime crash and ignores stale messages from its old child', async () => {
    const { supervisor, children, notify } = setup();
    const first = supervisor.ensureRunning();
    await flush();
    children[0].listen();
    await first;
    await flush();
    children[0].exit();
    const recovery = supervisor.ensureRunning();
    await flush();
    children[0].listen();
    expect(notify).not.toHaveBeenCalledWith(
      'backend-ready',
      expect.any(String)
    );
    children[1].listen();
    expect(await recovery).toBe(true);
    expect(notify).toHaveBeenCalledWith('backend-ready', 'Application prête !');
    await supervisor.shutdown();
  });

  it('cancels startup and does not fork again while quitting', async () => {
    const { supervisor, spawn } = setup();
    const first = supervisor.ensureRunning();
    await flush();
    await supervisor.shutdown();
    expect(await first).toBe(false);
    expect(await supervisor.ensureRunning()).toBe(false);
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it('refuses to spawn another child when the old process cannot be stopped', async () => {
    const { supervisor, children, spawn } = setup();
    const first = supervisor.ensureRunning();
    await flush();
    children[0].autoClose = false;
    await jest.advanceTimersByTimeAsync(150);
    expect(await first).toBe(false);
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(children[0].kill).toHaveBeenCalledWith('SIGKILL');
    children[0].exit();
    await supervisor.shutdown();
  });

  it('does not replace a healthy child after a transient health failure', async () => {
    const { supervisor, children, spawn, health } = setup();
    const first = supervisor.ensureRunning();
    await flush();
    children[0].listen();
    await first;
    health.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const check = supervisor.ensureRunning();
    await jest.advanceTimersByTimeAsync(1);
    expect(await check).toBe(true);
    expect(spawn).toHaveBeenCalledTimes(1);
    await supervisor.shutdown();
  });

  it('bounds unsuccessful startup to three attempts', async () => {
    const { supervisor, spawn, notify } = setup();
    const first = supervisor.ensureRunning();
    await jest.advanceTimersByTimeAsync(350);
    expect(await first).toBe(false);
    expect(spawn).toHaveBeenCalledTimes(3);
    expect(notify).toHaveBeenCalledWith(
      'error',
      'Impossible de démarrer le serveur local.'
    );
    await supervisor.shutdown();
  });
});

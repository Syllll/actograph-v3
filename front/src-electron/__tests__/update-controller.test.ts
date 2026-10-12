import { UpdateController } from '../update-controller';

function setup(needsNativePreparation = true) {
  const notify = jest.fn();
  const shutdown = jest.fn(async () => undefined);
  const install = jest.fn();
  const quitAfterFailure = jest.fn();
  const controller = new UpdateController({
    needsNativePreparation,
    notify,
    shutdown,
    install,
    quitAfterFailure,
    preparationTimeoutMs: 100,
    installationTimeoutMs: 100,
  });
  return { controller, notify, shutdown, install, quitAfterFailure };
}

function prepare(controller: UpdateController) {
  controller.startDownload();
  controller.downloaded();
  controller.nativeDownloaded();
}

describe('desktop update lifecycle', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('keeps the backend alive until macOS confirms native readiness', async () => {
    const { controller, shutdown, install } = setup();
    controller.startDownload();
    controller.downloaded();
    expect(controller.getState().phase).toBe('preparing');
    await expect(controller.install()).rejects.toThrow('No prepared update');
    expect(shutdown).not.toHaveBeenCalled();
    controller.nativeDownloaded();
    await controller.install();
    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(install).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('does not wait for a native event on Windows or Linux', async () => {
    const { controller, install } = setup(false);
    controller.startDownload();
    controller.downloaded();
    expect(controller.getState().phase).toBe('ready');
    await controller.install();
    expect(install).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('invalidates readiness when preparation fails and allows a new download', async () => {
    const { controller, shutdown } = setup();
    controller.startDownload();
    controller.downloaded();
    controller.fail(new Error('Native signature verification failed'));
    controller.nativeDownloaded();
    expect(controller.getState()).toMatchObject({
      phase: 'error', error: 'Native signature verification failed',
    });
    await expect(controller.install()).rejects.toThrow();
    expect(shutdown).not.toHaveBeenCalled();
    prepare(controller);
    expect(controller.getState().phase).toBe('ready');
  });

  it('times out preparation without shutting down and ignores late readiness', async () => {
    const { controller, shutdown, quitAfterFailure } = setup();
    controller.startDownload();
    controller.downloaded();
    await jest.advanceTimersByTimeAsync(100);
    expect(controller.getState()).toMatchObject({ phase: 'error', code: 'preparation-timeout' });
    expect(() => controller.startDownload()).toThrow('Restart the application');
    controller.nativeDownloaded();
    expect(controller.getState().phase).toBe('error');
    expect(shutdown).not.toHaveBeenCalled();
    expect(quitAfterFailure).not.toHaveBeenCalled();
  });

  it('cancels the preparation deadline once native readiness arrives', async () => {
    const { controller } = setup();
    prepare(controller);
    await jest.advanceTimersByTimeAsync(200);
    expect(controller.getState().phase).toBe('ready');
  });

  it('rejects an update invalidated after readiness', async () => {
    const { controller, shutdown } = setup();
    prepare(controller);
    controller.fail(new Error('Installer removed'));
    await expect(controller.install()).rejects.toThrow();
    expect(shutdown).not.toHaveBeenCalled();
  });

  it('shares one installation across repeated clicks and waits for shutdown', async () => {
    const { controller, shutdown, install } = setup();
    let finishShutdown!: () => void;
    shutdown.mockImplementation(() => new Promise<void>(resolve => { finishShutdown = resolve; }));
    prepare(controller);
    const first = controller.install();
    expect(controller.install()).toBe(first);
    await Promise.resolve();
    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(install).not.toHaveBeenCalled();
    finishShutdown();
    await first;
    await controller.install();
    expect(install).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('refuses concurrent downloads during preparation or installation', async () => {
    const { controller } = setup();
    controller.startDownload();
    expect(() => controller.startDownload()).toThrow();
    controller.downloaded();
    expect(() => controller.startDownload()).toThrow();
    controller.nativeDownloaded();
    expect(() => controller.startDownload()).toThrow();
    await controller.install();
    expect(() => controller.startDownload()).toThrow();
    controller.dispose();
  });

  it('closes cleanly if installation throws after backend shutdown', async () => {
    const { controller, install, quitAfterFailure } = setup();
    install.mockImplementation(() => { throw new Error('Installer unavailable'); });
    prepare(controller);
    await expect(controller.install()).rejects.toThrow('Installer unavailable');
    expect(controller.getState()).toMatchObject({ phase: 'error', error: 'Installer unavailable' });
    expect(quitAfterFailure).toHaveBeenCalledTimes(1);
  });

  it('does not launch an installer after a failure during shutdown', async () => {
    const { controller, shutdown, install, quitAfterFailure } = setup();
    shutdown.mockImplementation(async () => {
      controller.fail(new Error('Update failed during shutdown'));
    });
    prepare(controller);
    await expect(controller.install()).rejects.toThrow('Update failed during shutdown');
    expect(install).not.toHaveBeenCalled();
    expect(quitAfterFailure).toHaveBeenCalledTimes(1);
  });

  it('closes cleanly if shutdown rejects', async () => {
    const { controller, shutdown, install, quitAfterFailure } = setup();
    shutdown.mockRejectedValue(new Error('Backend shutdown failed'));
    prepare(controller);
    await expect(controller.install()).rejects.toThrow('Backend shutdown failed');
    expect(install).not.toHaveBeenCalled();
    expect(quitAfterFailure).toHaveBeenCalledTimes(1);
  });

  it('handles asynchronous installer failures and a missing restart', async () => {
    const { controller, quitAfterFailure } = setup();
    prepare(controller);
    await controller.install();
    controller.fail(new Error('Installer process failed'));
    expect(quitAfterFailure).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(200);
    expect(quitAfterFailure).toHaveBeenCalledTimes(1);

    const stalled = setup();
    prepare(stalled.controller);
    await stalled.controller.install();
    await jest.advanceTimersByTimeAsync(100);
    expect(stalled.controller.getState()).toMatchObject({ phase: 'error', code: 'installation-timeout' });
    expect(stalled.quitAfterFailure).toHaveBeenCalledTimes(1);
  });
});

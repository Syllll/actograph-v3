import type { DesktopUpdateState } from '../src/utils/desktop-update-state';

interface UpdateControllerOptions {
  needsNativePreparation: boolean;
  notify: (state: DesktopUpdateState) => void;
  shutdown: () => Promise<void>;
  install: () => void;
  quitAfterFailure: () => void;
  preparationTimeoutMs?: number;
  installationTimeoutMs?: number;
}

/** Keeps the API alive until the update is ready, and owns one installation. */
export class UpdateController {
  private state: DesktopUpdateState = { phase: 'idle' };
  private timer?: ReturnType<typeof setTimeout>;
  private installation?: Promise<void>;
  private shutdownStarted = false;
  private shutdownFinished = false;

  constructor(private readonly options: UpdateControllerOptions) {}

  getState(): DesktopUpdateState {
    return { ...this.state };
  }

  startDownload(): void {
    // A stalled native preparation can leave electron-updater's download
    // promise pending. Starting again would only reuse that stuck promise.
    if (this.state.code === 'preparation-timeout')
      throw new Error('Restart the application before retrying this update');
    if (['downloading', 'preparing', 'ready', 'installing'].includes(this.state.phase))
      throw new Error('An update is already in progress');
    this.setState({ phase: 'downloading' });
  }

  downloaded(): void {
    if (this.state.phase !== 'downloading') return;
    if (!this.options.needsNativePreparation) {
      this.setState({ phase: 'ready' });
      return;
    }
    // electron-updater emits its event before Squirrel.Mac verifies the ZIP.
    this.setState({ phase: 'preparing' });
    this.timer = setTimeout(() => {
      this.fail('Update preparation timed out', 'preparation-timeout');
    }, this.options.preparationTimeoutMs ?? 120_000);
  }

  nativeDownloaded(): void {
    if (this.state.phase === 'preparing') this.setState({ phase: 'ready' });
  }

  fail(error: unknown, code?: DesktopUpdateState['code']): void {
    this.setState({
      phase: 'error',
      error: error instanceof Error ? error.message : String(error),
      code,
    });
    // The supervisor cannot restart after shutdown. Close cleanly rather than
    // leave an open window with a stopped API when installation fails late.
    if (this.shutdownFinished) this.options.quitAfterFailure();
  }

  install(): Promise<void> {
    if (this.installation) return this.installation;
    if (this.state.phase !== 'ready')
      return Promise.reject(new Error('No prepared update available'));
    this.setState({ phase: 'installing' });
    this.installation = Promise.resolve().then(async () => {
      try {
        this.shutdownStarted = true;
        await this.options.shutdown();
        this.shutdownFinished = true;
        if (this.state.phase !== 'installing')
          throw new Error(this.state.error || 'Update installation cancelled');
        this.timer = setTimeout(() => {
          this.fail('Update installation timed out', 'installation-timeout');
        }, this.options.installationTimeoutMs ?? 30_000);
        this.options.install();
      } catch (error) {
        this.fail(error);
        if (this.shutdownStarted && !this.shutdownFinished)
          this.options.quitAfterFailure();
        throw error;
      }
    });
    return this.installation;
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  private setState(state: DesktopUpdateState): void {
    this.dispose();
    this.state = state;
    this.options.notify(this.getState());
  }
}

import type { ChildProcess } from 'child_process';

export type BackendStatus =
  | 'starting-server'
  | 'backend-restarting'
  | 'ready'
  | 'backend-ready'
  | 'error'
  | 'backend-error';

interface BackendChild {
  process: ChildProcess;
  ready: Promise<void>;
  closed: Promise<void>;
  cancelStartup: () => void;
  intentional: boolean;
  listening: boolean;
  exited: boolean;
}

interface SupervisorOptions {
  port: number;
  spawn: () => ChildProcess;
  health: () => Promise<boolean>;
  notify: (status: BackendStatus, message: string) => void;
  log: (message: string, error?: unknown) => void;
  startupTimeoutMs?: number;
  shutdownTimeoutMs?: number;
  killTimeoutMs?: number;
  retryDelayMs?: number;
}

/** Owns every backend child, including initial startup, recovery and shutdown. */
export class BackendSupervisor {
  private child?: BackendChild;
  private ensurePromise?: Promise<boolean>;
  private shutdownPromise?: Promise<void>;
  private quitting = false;
  private hasStarted = false;

  constructor(private readonly options: SupervisorOptions) {}

  ensureRunning(): Promise<boolean> {
    if (this.quitting) return Promise.resolve(false);
    if (this.ensurePromise) return this.ensurePromise;
    // Defer work until the promise is installed, including synchronous spawn failures.
    const pending = Promise.resolve().then(() => this.ensure());
    this.ensurePromise = pending;
    const clearPending = () => {
      if (this.ensurePromise === pending) this.ensurePromise = undefined;
    };
    void pending.then(clearPending, clearPending);
    return pending;
  }

  shutdown(): Promise<void> {
    this.quitting = true;
    if (!this.shutdownPromise) {
      this.shutdownPromise = (async () => {
        await this.stopChild();
        await this.ensurePromise;
        await this.stopChild();
      })();
    }
    return this.shutdownPromise;
  }

  /** Last-resort synchronous cleanup when Electron cannot await shutdown. */
  killImmediately(): void {
    this.quitting = true;
    const child = this.child;
    if (child && !child.exited) {
      child.intentional = true;
      child.cancelStartup();
      child.process.kill('SIGKILL');
    }
  }

  private async ensure(): Promise<boolean> {
    const restarting = this.hasStarted;
    try {
      if (this.child?.listening && !this.child.exited) {
        // A busy API or a transient wake-up failure is not enough to kill a child.
        for (let probe = 0; probe < 3 && !this.quitting; probe++) {
          const child: BackendChild = this.child;
          if (
            (await this.options.health()) &&
            this.child === child &&
            !child.exited &&
            !this.quitting
          )
            return true;
          await this.delay();
        }
      }
      if (this.quitting) return false;
      this.options.notify(
        restarting ? 'backend-restarting' : 'starting-server',
        restarting ? 'Redémarrage du serveur...' : 'Démarrage du serveur...'
      );
      for (let attempt = 1; attempt <= 3 && !this.quitting; attempt++) {
        // Never open the database again until the previous child has closed.
        await this.stopChild();
        if (this.quitting) return false;
        try {
          const child = this.startChild();
          await child.ready;
          const healthy = await this.options.health();
          if (
            healthy &&
            !child.exited &&
            this.child === child &&
            !this.quitting
          ) {
            this.hasStarted = true;
            this.options.notify(
              restarting ? 'backend-ready' : 'ready',
              'Application prête !'
            );
            return true;
          }
          throw new Error('Backend health check failed after listening');
        } catch (error) {
          this.options.log(
            `Backend startup failed (attempt ${attempt}/3)`,
            error
          );
          await this.stopChild();
          if (!this.quitting && attempt < 3) await this.delay();
        }
      }
    } catch (error) {
      this.options.log('Backend lifecycle failure', error);
    }
    if (!this.quitting) {
      this.options.notify(
        restarting ? 'backend-error' : 'error',
        restarting
          ? 'Échec du redémarrage du serveur'
          : 'Impossible de démarrer le serveur local.'
      );
    }
    return false;
  }

  private startChild(): BackendChild {
    const process = this.options.spawn();
    let resolveReady!: () => void;
    let rejectReady!: (error: Error) => void;
    let resolveClosed!: () => void;
    const ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    const closed = new Promise<void>((resolve) => {
      resolveClosed = resolve;
    });
    const timer = setTimeout(() => {
      rejectReady(new Error('Backend startup timeout'));
    }, this.options.startupTimeoutMs ?? 60_000);
    const child: BackendChild = {
      process,
      ready,
      closed,
      intentional: false,
      listening: false,
      exited: false,
      cancelStartup: () => {
        clearTimeout(timer);
        rejectReady(new Error('Backend startup cancelled'));
      },
    };
    this.child = child;
    process.on('message', (message: unknown) => {
      if (!message || typeof message !== 'object') return;
      const data = message as {
        type?: string;
        port?: number;
        message?: string;
      };
      if (
        data.type === 'backend-ready' &&
        data.port === this.options.port &&
        !child.intentional &&
        !child.exited
      ) {
        child.listening = true;
        clearTimeout(timer);
        resolveReady();
      } else if (data.type === 'backend-startup-error') {
        clearTimeout(timer);
        rejectReady(new Error(data.message || 'Backend bootstrap failed'));
      }
    });
    process.on('error', (error: Error) => {
      clearTimeout(timer);
      this.options.log('Server process error', error);
      rejectReady(error);
    });
    process.once('exit', (code, signal) => {
      child.exited = true;
      clearTimeout(timer);
      this.options.log(
        `Server process exited (pid=${process.pid}, code=${code}, signal=${signal})`
      );
      rejectReady(
        new Error(
          `Server process exited before ready (code=${code}, signal=${signal})`
        )
      );
      // Startup/recovery already owns failures while its promise is in flight.
      if (
        this.child === child &&
        child.listening &&
        !child.intentional &&
        !this.quitting &&
        !this.ensurePromise
      ) {
        void this.ensureRunning();
      }
    });
    process.once('close', () => {
      child.exited = true;
      clearTimeout(timer);
      resolveClosed();
    });
    return child;
  }

  private async stopChild(): Promise<void> {
    const child = this.child;
    if (!child) return;
    child.intentional = true;
    child.cancelStartup();
    if (!child.exited && child.process.connected) {
      child.process.send({ type: 'shutdown' }, (error) => {
        if (error) this.options.log('Backend shutdown IPC failed', error);
      });
    }
    let closed = await this.waitForClose(
      child,
      this.options.shutdownTimeoutMs ?? 5_000
    );
    if (!closed && !child.exited) child.process.kill('SIGTERM');
    if (!closed)
      closed = await this.waitForClose(
        child,
        this.options.killTimeoutMs ?? 2_000
      );
    if (!closed && !child.exited) child.process.kill('SIGKILL');
    if (!closed)
      closed = await this.waitForClose(
        child,
        this.options.killTimeoutMs ?? 2_000
      );
    if (!closed)
      throw new Error(
        'Backend did not terminate; refusing to start another process'
      );
    if (this.child === child) this.child = undefined;
  }

  private waitForClose(
    child: BackendChild,
    timeoutMs: number
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs);
      void child.closed.then(() => {
        clearTimeout(timer);
        resolve(true);
      });
    });
  }

  private delay(): Promise<void> {
    return new Promise((resolve) =>
      setTimeout(resolve, this.options.retryDelayMs ?? 250)
    );
  }
}

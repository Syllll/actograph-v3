import { shouldCommitGraphInit } from './graph-init-ownership';

describe('shouldCommitGraphInit', () => {
  it('commits only when the initialized instance is still current and ready', () => {
    const app = { ready: true };
    expect(
      shouldCommitGraphInit(app, app, (instance) => instance.ready),
    ).toBe(true);
  });

  it('rejects a cancelled engine even if it is still the shared instance', () => {
    const app = { ready: false };
    expect(
      shouldCommitGraphInit(app, app, (instance) => instance.ready),
    ).toBe(false);
  });

  it('rejects a completed init that no longer owns shared state', () => {
    const previous = { ready: true };
    const current = { ready: false };
    expect(
      shouldCommitGraphInit(current, previous, (instance) => instance.ready),
    ).toBe(false);
  });
});

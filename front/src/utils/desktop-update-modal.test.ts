import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as ts from 'typescript';
import * as vue from 'vue';
import { compileTemplate } from '@vue/compiler-sfc';
import { renderToString } from '@vue/server-renderer';
import type { DesktopUpdateState } from './desktop-update-state';

interface ModalView {
  state: { phase: string; error: string };
  methods: {
    init: () => Promise<void>;
    submit: () => Promise<void>;
    close: () => void;
  };
}

// Exercise the real SFC script and template without an Electron/DOM dependency.
function setup(snapshot: Promise<DesktopUpdateState> = Promise.resolve({ phase: 'idle' })) {
  const source = fs.readFileSync(path.join(__dirname, '../components/update-modal/Index.vue'), 'utf8');
  const script = source.match(/<script lang="ts">([\s\S]*?)<\/script>/)![1];
  const template = source.match(/<template>([\s\S]*?)<\/template>\s*<script/)![1];
  const unsubscribes = [jest.fn(), jest.fn()];
  let onUpdate!: (state: DesktopUpdateState) => void;
  let onUnmount!: () => void;
  const emit = jest.fn();
  const service = {
    onUpdateDownloadProgress: jest.fn(() => unsubscribes[0]),
    onUpdateState: jest.fn((callback: typeof onUpdate) => {
      onUpdate = callback;
      return unsubscribes[1];
    }),
    getUpdateState: jest.fn(() => snapshot),
    quitAndInstallUpdate: jest.fn(async () => undefined),
    openLogs: jest.fn(),
  };
  const container = vue.defineComponent({
    setup(_props, { slots }) {
      return () => vue.h('section', [...(slots.default?.() || []), ...(slots.actions?.() || [])]);
    },
  });
  const button = vue.defineComponent({
    props: ['label'],
    setup(props) { return () => vue.h('button', props.label); },
  });
  const exports: {
    default?: { setup: (props: object, context: object) => ModalView };
    render?: vue.RenderFunction;
  } = {};
  const context = {
    exports,
    console,
    Error,
    require(name: string) {
      if (name === 'vue') return { ...vue, watch: () => undefined, onUnmounted: (fn: typeof onUnmount) => { onUnmount = fn; } };
      if (name === 'vue-i18n') return { useI18n: () => ({ t: (key: string) => key }) };
      if (name === '@services/system/index.service') return { default: service };
      if (name === '@lib-improba/components') return { DDialog: container, DSubmitBtn: button, DCancelBtn: button, DProgressBar: container };
      throw new Error(`Unexpected import: ${name}`);
    },
  };
  const run = (code: string) => {
    const compiled = ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    return vm.runInNewContext(`(() => {\n${compiled}\n})()`, context);
  };
  run(script);
  const component = exports.default!;
  const view = component.setup({ triggerOpen: false }, { emit });
  const compiled = compileTemplate({ source: template, filename: 'Index.vue', id: 'update-modal-test' });
  expect(compiled.errors).toEqual([]);
  run(compiled.code);
  const render = async () => {
    const app = vue.createSSRApp({ ...component, setup: () => view, render: exports.render });
    app.config.globalProperties.$t = (key: string) => key;
    for (const name of ['q-icon', 'q-spinner']) app.component(name, container);
    return renderToString(app);
  };
  return { view, service, emit, unsubscribes, render, update: (state: DesktopUpdateState) => onUpdate(state), unmount: () => onUnmount() };
}

describe('desktop update modal', () => {
  it('renders an error after readiness instead of hiding it behind the success text', async () => {
    const modal = setup();
    await modal.view.methods.init();
    modal.update({ phase: 'ready' });
    expect(await modal.render()).toContain('updateModal.downloadedBody');
    modal.update({ phase: 'error', error: 'Signature verification failed' });
    const html = await modal.render();
    expect(html).toContain('Signature verification failed');
    expect(html).toContain('updateModal.openLogs');
    expect(html).not.toContain('updateModal.downloadedBody');
    expect(html).not.toContain('updateModal.restartInstall');
  });

  it('renders preparation without offering installation and translates its timeout', async () => {
    const modal = setup();
    await modal.view.methods.init();
    modal.update({ phase: 'preparing' });
    expect(await modal.render()).toContain('updateModal.preparing');
    await modal.view.methods.submit();
    expect(modal.service.quitAndInstallUpdate).not.toHaveBeenCalled();
    modal.update({ phase: 'error', code: 'preparation-timeout', error: 'Timeout' });
    const html = await modal.render();
    expect(html).toContain('updateModal.preparationTimeout');
    expect(html).not.toContain('updateModal.retry');
  });

  it('locks immediately on a click, refuses a second click, and catches IPC failures', async () => {
    const modal = setup();
    await modal.view.methods.init();
    modal.update({ phase: 'ready' });
    let rejectInstall!: (error: Error) => void;
    modal.service.quitAndInstallUpdate.mockImplementation(() => new Promise((_resolve, reject) => { rejectInstall = reject; }));
    const first = modal.view.methods.submit();
    await modal.view.methods.submit();
    expect(modal.service.quitAndInstallUpdate).toHaveBeenCalledTimes(1);
    expect(modal.view.state.phase).toBe('installing');
    expect(await modal.render()).toContain('updateModal.installing');
    modal.view.methods.close();
    expect(modal.emit).not.toHaveBeenCalled();
    rejectInstall(new Error('Installer unavailable'));
    await first;
    expect(await modal.render()).toContain('Installer unavailable');
  });

  it('restores readiness on reopen without overwriting newer pushed errors', async () => {
    const restored = setup(Promise.resolve({ phase: 'ready' }));
    await restored.view.methods.init();
    expect(restored.view.state.phase).toBe('ready');
    let resolveSnapshot!: (state: DesktopUpdateState) => void;
    const modal = setup(new Promise(resolve => { resolveSnapshot = resolve; }));
    const initialising = modal.view.methods.init();
    modal.update({ phase: 'error', error: 'Native preparation failed' });
    resolveSnapshot({ phase: 'ready' });
    await initialising;
    expect(modal.view.state.phase).toBe('error');
    expect(modal.view.state.error).toBe('Native preparation failed');
    modal.unmount();
    expect(modal.unsubscribes.every(unsubscribe => unsubscribe.mock.calls.length === 1)).toBe(true);
  });
});

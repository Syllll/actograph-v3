/* eslint-disable */
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module 'quasar/wrappers' {
  import { Router } from 'vue-router';
  import { App } from 'vue';

  interface BootFileParams<TState = unknown> {
    app: App;
    router: Router;
    store?: TState;
    ssrContext?: unknown;
    urlPath?: string;
    publicPath?: string;
    redirect?: (url: string) => void;
  }

  export function boot<TState = unknown>(
    callback: (params: BootFileParams<TState>) => void | Promise<void>
  ): (params: BootFileParams<TState>) => void | Promise<void>;

  export function route<TState = unknown>(
    callback: (deps: { store?: TState; ssrContext?: unknown }) => unknown
  ): (deps: { store?: TState; ssrContext?: unknown }) => unknown;
}


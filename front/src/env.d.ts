/* eslint-disable */

declare module '*.html?raw' {
  const content: string;
  export default content;
}

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
    AMCHART5_LICENCE_KEY?: string;
  }
}

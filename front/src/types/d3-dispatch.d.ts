// Type declaration override for @types/d3-dispatch to fix TypeScript 4.5.4 compatibility
// This file replaces the incompatible TypeScript 5.0+ syntax with compatible TypeScript 4.5.4 syntax
// The official @types/d3-dispatch uses "const type parameters" which is not supported in TS 4.5.4

declare module 'd3-dispatch' {
  export function dispatch<This extends object, EventMap extends Record<string, any[]>>(
    ...types: string[]
  ): Dispatch<This, EventMap>;
  
  export interface Dispatch<This extends object, EventMap extends Record<string, any[]>> {
    on(typenames: string, callback: (this: This, ...args: any[]) => void): this;
    on(typenames: string, callback: null): this;
    copy(): Dispatch<This, EventMap>;
    call(type: string, ...args: any[]): void;
    apply(type: string, that: This, args: any[]): void;
  }
}


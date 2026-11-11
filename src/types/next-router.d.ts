// This file contains type declarations for Next.js modules
// Since this project is using Vite and not Next.js directly, we need to provide type stubs

declare module 'next/router' {
  export interface Router {
    push: (url: string, as?: string, options?: any) => Promise<boolean>;
    replace: (url: string, as?: string, options?: any) => Promise<boolean>;
    prefetch: (url: string) => Promise<void>;
    back: () => void;
    reload: () => void;
    beforePopState: (cb: (state: any) => boolean) => void;
    events: {
      on: (event: string, callback: Function) => void;
      off: (event: string, callback: Function) => void;
      emit: (event: string, ...args: any[]) => void;
    };
    isFallback: boolean;
    isReady: boolean;
    isPreview: boolean;
    query: Record<string, string | string[]>;
    asPath: string;
    pathname: string;
    basePath: string;
    locale: string;
    locales: string[];
    defaultLocale: string;
  }

  export function useRouter(): Router;
}
declare module 'process' {
  global {
    interface Window {
      process: any;
      Buffer: any;
    }
  }
  export = process;
} 
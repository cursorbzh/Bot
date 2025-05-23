declare module 'bottleneck' {
  interface BottleneckOptions {
    minTime?: number;
    maxConcurrent?: number;
    reservoir?: number;
    reservoirRefreshAmount?: number;
    reservoirRefreshInterval?: number;
  }

  interface BottleneckInstance {
    schedule<T>(fn: () => Promise<T>): Promise<T>;
    on(event: string, callback: (error: Error, jobInfo: any) => Promise<number | void> | void): void;
  }

  export default class Bottleneck {
    constructor(options?: BottleneckOptions);
    schedule<T>(fn: () => Promise<T>): Promise<T>;
    on(event: string, callback: (error: Error, jobInfo: any) => Promise<number | void> | void): void;
  }
} 
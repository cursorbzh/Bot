import type { LogLevel, Logger } from 'vite';
import type { RollupError } from 'rollup';

export function createLogger(): Logger {
  const logger: Logger = {
    hasWarned: false,
    hasErrorLogged(error: Error | RollupError): boolean {
      return false;
    },
    info(msg: string, options?: any) {
      console.log(msg);
    },
    warn(msg: string, options?: any) {
      console.warn(msg);
      this.hasWarned = true;
    },
    warnOnce(msg: string, options?: any) {
      if (!this.hasWarned) {
        console.warn(msg);
        this.hasWarned = true;
      }
    },
    error(msg: string, options?: any) {
      console.error(msg);
    },
    clearScreen(type?: LogLevel) {
      // Do nothing
    }
  };

  return logger;
} 
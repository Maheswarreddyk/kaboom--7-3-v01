import { LoggerPort, LogData } from '../ports/LoggerPort.js';

/**
 * Console Logger — Structured JSON logging to stdout/stderr.
 * Every log entry includes timestamp, level, engine, and action
 * for easy filtering, searching, and debugging.
 */
export class ConsoleLogger implements LoggerPort {
  /** Format a log entry as a JSON string */
  private format(level: string, engine: string, action: string, data?: LogData): string {
    const entry: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level,
      engine,
      action,
    };
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          entry[key] = value;
        }
      }
    }
    return JSON.stringify(entry);
  }

  /** Log informational message */
  info(engine: string, action: string, data?: LogData): void {
    console.log(this.format('INFO', engine, action, data));
  }

  /** Log warning */
  warn(engine: string, action: string, data?: LogData): void {
    console.warn(this.format('WARN', engine, action, data));
  }

  /** Log error */
  error(engine: string, action: string, data?: LogData): void {
    console.error(this.format('ERROR', engine, action, data));
  }

  /** Log a performance metric with duration */
  metric(engine: string, action: string, durationMs: number, data?: LogData): void {
    console.log(this.format('METRIC', engine, action, { ...data, durationMs }));
  }
}

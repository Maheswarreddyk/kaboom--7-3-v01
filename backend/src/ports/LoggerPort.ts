/**
 * Logger Port — Structured logging abstraction.
 * Every engine action produces traceable, structured log entries.
 */
export interface LogData {
  sessionId?: string;
  matchId?: string;
  reservationId?: string;
  reason?: string;
  score?: number;
  durationMs?: number;
  stage?: string | number;
  removed?: number;
  remaining?: number;
  [key: string]: unknown;
}

export interface LoggerPort {
  /** Log informational message */
  info(engine: string, action: string, data?: LogData): void;
  /** Log warning */
  warn(engine: string, action: string, data?: LogData): void;
  /** Log error */
  error(engine: string, action: string, data?: LogData): void;
  /** Log a performance metric with duration */
  metric(engine: string, action: string, durationMs: number, data?: LogData): void;
}

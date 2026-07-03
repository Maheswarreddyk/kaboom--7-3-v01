/**
 * Analytics Engine — Gathers connection metrics, events, and performance statistics.
 *
 * Responsibilities:
 * - Aggregating stats (active users, waiting users, matches today, online count)
 * - Recording periodic server metrics to database
 * - Logging event entries to database connection log
 * - Decoupled passive observer subscribing to domain events
 */

import type { DatabasePort } from '../ports/DatabasePort.js';
import type { LoggerPort } from '../ports/LoggerPort.js';
import type { EventBus } from '../events/EventBus.js';
import type {
  StatsResponse,
  ConnectionEvent,
  ServerMetrics,
} from '../types/index.js';

export class AnalyticsEngine {
  private static readonly ENGINE = 'Analytics';

  constructor(
    private db: DatabasePort,
    private logger: LoggerPort,
    private eventBus: EventBus
  ) {
    this.wireListeners();
  }

  /**
   * Subscribe to all EventBus events to log connection activities automatically.
   */
  private wireListeners(): void {
    this.eventBus.on('queue:joined', (data) =>
      this.logEvent(data.sessionId, 'queue_join', { timestamp: data.timestamp })
    );

    this.eventBus.on('queue:left', (data) =>
      this.logEvent(data.sessionId, 'queue_leave', { reason: data.reason })
    );

    this.eventBus.on('match:reserved', (data) => {
      this.logEvent(data.userA, 'reserved', { matchId: data.matchId, reservationId: data.reservationId, partnerId: data.userB });
      this.logEvent(data.userB, 'reserved', { matchId: data.matchId, reservationId: data.reservationId, partnerId: data.userA });
    });

    this.eventBus.on('match:confirmed', (data) => {
      this.logEvent(data.userA, 'match_start', { matchId: data.matchId, partnerId: data.userB });
      this.logEvent(data.userB, 'match_start', { matchId: data.matchId, partnerId: data.userA });
    });

    this.eventBus.on('match:ended', (data) => {
      this.logEvent(null, 'match_end', { matchId: data.matchId, reason: data.reason });
    });

    this.eventBus.on('session:created', (data) =>
      this.logEvent(data.sessionId, 'session_start')
    );

    this.eventBus.on('session:ended', (data) =>
      this.logEvent(data.sessionId, 'session_end')
    );

    this.eventBus.on('report:submitted', (data) =>
      this.logEvent(data.reporterSessionId, 'report', { reportedSessionId: data.reportedSessionId })
    );
  }

  /**
   * Insert a connection event log.
   */
  async logEvent(
    sessionId: string | null,
    event: ConnectionEvent,
    details: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      await this.db.insert('connection_logs', {
        session_id: sessionId,
        event,
        details,
      });
    } catch (err: any) {
      this.logger.error(AnalyticsEngine.ENGINE, 'log_event_failed', {
        sessionId: sessionId || undefined,
        event,
        reason: err.message,
      });
    }
  }

  /**
   * Take a periodic snapshot of server performance and record it to database server_metrics.
   */
  async recordMetrics(onlineNow: number): Promise<ServerMetrics | null> {
    const start = Date.now();

    try {
      const activeUsers = await this.db.count('visitor_sessions', [
        { column: 'status', operator: 'eq', value: 'active' },
      ]);

      const waitingUsers = await this.db.count('waiting_queue', [
        { column: 'status', operator: 'eq', value: 'waiting' },
        { column: 'reserved_by', operator: 'is', value: null },
      ]);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const matchesToday = await this.db.count('matches', [
        { column: 'started_at', operator: 'gte', value: startOfDay.toISOString() },
      ]);

      const metrics = await this.db.insert<ServerMetrics>('server_metrics', {
        active_users: activeUsers,
        waiting_users: waitingUsers,
        matches_today: matchesToday,
      });

      this.logger.metric(AnalyticsEngine.ENGINE, 'metrics_recorded', Date.now() - start, {
        activeUsers,
        waitingUsers,
        matchesToday,
        onlineNow,
      });

      return metrics;
    } catch (err: any) {
      this.logger.error(AnalyticsEngine.ENGINE, 'record_metrics_failed', {
        reason: err.message,
      });
      return null;
    }
  }

  /**
   * Retrieve aggregate platform stats.
   */
  async getStats(onlineNow: number): Promise<StatsResponse> {
    try {
      const activeUsers = await this.db.count('visitor_sessions', [
        { column: 'status', operator: 'eq', value: 'active' },
      ]);

      const waitingUsers = await this.db.count('waiting_queue', [
        { column: 'status', operator: 'eq', value: 'waiting' },
        { column: 'reserved_by', operator: 'is', value: null },
      ]);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const matchesToday = await this.db.count('matches', [
        { column: 'started_at', operator: 'gte', value: startOfDay.toISOString() },
      ]);

      return {
        activeUsers,
        waitingUsers,
        matchesToday,
        onlineNow,
      };
    } catch (err: any) {
      this.logger.error(AnalyticsEngine.ENGINE, 'get_stats_failed', { reason: err.message });
      return {
        activeUsers: 0,
        waitingUsers: 0,
        matchesToday: 0,
        onlineNow,
      };
    }
  }
}

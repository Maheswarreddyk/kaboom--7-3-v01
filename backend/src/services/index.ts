/**
 * Services Barrel — Re-exports deprecated services as thin wrappers.
 * Delegates all operations to the new V2 engines singleton in index.ts.
 *
 * Keeps legacy controller bindings working seamlessly without breaking changes.
 */

import { engines } from '../index.js';
import type {
  FeedbackRequest,
  ReportRequest,
  StartSessionRequest,
  StatsResponse,
  VisitorSession,
} from '../types/index.js';

export const sessionService = {
  async startSession(data: StartSessionRequest): Promise<VisitorSession> {
    const result = await engines.session.create(data);
    const session = await engines.session.validate(result.sessionId);
    if (!session) throw new Error('Failed to create session');
    return session as any;
  },

  async endSession(sessionId: string): Promise<void> {
    await engines.session.end(sessionId);
  },

  async getSession(sessionId: string): Promise<VisitorSession | null> {
    const session = await engines.session.validate(sessionId);
    return session as any;
  },
};

export const statsService = {
  async getStats(onlineNow: number): Promise<StatsResponse> {
    return engines.analytics.getStats(onlineNow);
  },

  async recordMetrics(onlineNow: number): Promise<void> {
    await engines.analytics.recordMetrics(onlineNow);
  },
};

export const reportService = {
  async submitReport(data: ReportRequest) {
    const report = await engines.db.insert('reports', {
      reporter_session: data.reporterSessionId,
      reported_session: data.reportedSessionId,
      reason: data.reason,
      notes: data.notes || null,
    });
    engines.session.eventBus.emit('report:submitted', {
      reporterSessionId: data.reporterSessionId,
      reportedSessionId: data.reportedSessionId,
    });
    return report;
  },
};

export const feedbackService = {
  async submitFeedback(data: FeedbackRequest) {
    return engines.db.insert('feedback', {
      session_id: data.sessionId,
      rating: data.rating,
      feedback: data.feedback || null,
    });
  },
};

export const cleanupService = {
  async runCleanup(queueStaleMs: number, _matchStaleMs: number): Promise<void> {
    const reservationTimeoutMs = 10000;
    await engines.queue.cleanupStale(queueStaleMs, reservationTimeoutMs);
    await engines.chat.purgeExpired();
    await engines.reservation.cleanupExpired();
  },
};

/**
 * Routes Factory — Configures Express endpoints to delegate to V2 engines.
 *
 * Maintains absolute backward compatibility with the existing client APIs
 * (same path names, same request/response structures).
 */

import { Router } from 'express';
import type { Engines } from '../engines/index.js';
import {
  apiRateLimiter,
  reportRateLimiter,
  sessionRateLimiter,
} from '../middleware/rateLimiter.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export function createRouter(engines: Engines): Router {
  const router = Router();

  router.use(apiRateLimiter);

  // Health check endpoint
  router.get('/health', asyncHandler(async (_req, res) => {
    const { checkDatabaseConnection } = await import('../database/client.js');
    const dbConnected = await checkDatabaseConnection();

    res.json({
      success: true,
      status: dbConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      uptime: process.uptime(),
    });
  }));

  // Platform stats endpoint
  router.get('/stats', asyncHandler(async (_req, res) => {
    // Check database to count active sessions
    const activeCount = await engines.session.db.count('visitor_sessions', [
      { column: 'status', operator: 'eq', value: 'active' },
    ]);
    const stats = await engines.analytics.getStats(activeCount);
    res.json({ success: true, data: stats });
  }));

  // Session start endpoint
  router.post('/start-session', sessionRateLimiter, asyncHandler(async (req, res) => {
    const { country, browser, device, platform } = req.body ?? {};
    const result = await engines.session.create({ country, browser, device, platform });
    const session = await engines.session.validate(result.sessionId);

    res.status(201).json({
      success: true,
      data: {
        sessionId: result.sessionId,
        sessionToken: result.sessionToken,
        createdAt: session?.created_at || new Date().toISOString(),
      },
    });
  }));

  // Session end endpoint
  router.post('/end-session', asyncHandler(async (req, res) => {
    const { sessionId } = req.body ?? {};
    if (!sessionId || typeof sessionId !== 'string') {
      throw new AppError(400, 'sessionId is required');
    }
    await engines.session.end(sessionId);
    res.json({ success: true, message: 'Session ended' });
  }));

  // Report user endpoint
  router.post('/report', reportRateLimiter, asyncHandler(async (req, res) => {
    const { reporterSessionId, reportedSessionId, reason, notes } = req.body ?? {};
    if (!reporterSessionId || !reportedSessionId || !reason) {
      throw new AppError(400, 'reporterSessionId, reportedSessionId, and reason are required');
    }
    const report = await engines.db.insert('reports', {
      reporter_session: reporterSessionId,
      reported_session: reportedSessionId,
      reason,
      notes: notes || null,
    });
    engines.session.eventBus.emit('report:submitted', { reporterSessionId, reportedSessionId });
    res.status(201).json({ success: true, data: report });
  }));

  // Submit feedback endpoint
  router.post('/feedback', asyncHandler(async (req, res) => {
    const { sessionId, rating, feedback } = req.body ?? {};
    if (!sessionId || typeof rating !== 'number') {
      throw new AppError(400, 'sessionId and rating are required');
    }
    const entry = await engines.db.insert('feedback', {
      session_id: sessionId,
      rating,
      feedback: feedback || null,
    });
    res.status(201).json({ success: true, data: entry });
  }));

  // Match queue join
  router.post('/match/join', asyncHandler(async (req, res) => {
    const { sessionId, sessionToken } = req.body ?? {};
    if (!sessionId || !sessionToken) {
      res.status(400).json({ success: false, error: 'sessionId and sessionToken are required' });
      return;
    }

    const session = await engines.session.validate(sessionId, sessionToken);
    if (!session) {
      res.status(401).json({ success: false, error: 'Invalid session credentials' });
      return;
    }

    await engines.session.transitionState(sessionId, 'searching');
    await engines.queue.join(sessionId);

    // Run matchmaking pipeline
    const matchResult = await engines.matching.findBestMatch(sessionId);
    if (matchResult) {
      const resResult = await engines.reservation.reserveAndConfirm(
        sessionId,
        matchResult.candidateSessionId,
        matchResult.totalScore,
        matchResult.breakdown
      );
      if (resResult.success) {
        res.json({
          success: true,
          data: {
            status: 'matched',
            matchId: resResult.matchId,
            partnerSessionId: matchResult.candidateSessionId,
          },
        });
        return;
      }
    }

    res.json({
      success: true,
      data: {
        status: 'waiting',
        queuePosition: await engines.queue.getLength(),
        message: 'Waiting for a partner...',
      },
    });
  }));

  // Match queue leave
  router.post('/match/leave', asyncHandler(async (req, res) => {
    const { sessionId, sessionToken } = req.body ?? {};
    if (!sessionId || !sessionToken) {
      res.status(400).json({ success: false, error: 'sessionId and sessionToken are required' });
      return;
    }

    const session = await engines.session.validate(sessionId, sessionToken);
    if (!session) {
      res.status(401).json({ success: false, error: 'Invalid session credentials' });
      return;
    }

    await engines.queue.leave(sessionId);
    await engines.session.transitionState(sessionId, 'active');
    res.json({ success: true, message: 'Left queue' });
  }));

  // Skip to next partner
  router.post('/match/next', asyncHandler(async (req, res) => {
    const { sessionId, sessionToken } = req.body ?? {};
    if (!sessionId || !sessionToken) {
      res.status(400).json({ success: false, error: 'sessionId and sessionToken are required' });
      return;
    }

    const session = await engines.session.validate(sessionId, sessionToken);
    if (!session) {
      res.status(401).json({ success: false, error: 'Invalid session credentials' });
      return;
    }

    // 1. Terminate current active match (if exists)
    const currentMatch = await engines.db.queryOne<any>('matches', {
      filters: [
        { column: 'user_a', operator: 'eq', value: sessionId },
        { column: 'lifecycle', operator: 'neq', value: 'ended' },
        { column: 'lifecycle', operator: 'neq', value: 'cancelled' },
      ],
    }) || await engines.db.queryOne<any>('matches', {
      filters: [
        { column: 'user_b', operator: 'eq', value: sessionId },
        { column: 'lifecycle', operator: 'neq', value: 'ended' },
        { column: 'lifecycle', operator: 'neq', value: 'cancelled' },
      ],
    });

    if (currentMatch) {
      await engines.db.update('matches', [{ column: 'id', operator: 'eq', value: currentMatch.id }], {
        lifecycle: 'ended',
        ended_at: new Date().toISOString(),
        ended_reason: 'next',
      });
      const partnerId = currentMatch.user_a === sessionId ? currentMatch.user_b : currentMatch.user_a;
      await engines.session.transitionState(partnerId, 'active');
      await engines.signaling.signaling.sendToSession(partnerId, 'partner_left', { reason: 'next' });
    }

    // 2. Put self back into search and queue
    await engines.session.transitionState(sessionId, 'searching');
    await engines.queue.join(sessionId);

    // 3. Search and pair
    const matchResult = await engines.matching.findBestMatch(sessionId);
    if (matchResult) {
      const resResult = await engines.reservation.reserveAndConfirm(
        sessionId,
        matchResult.candidateSessionId,
        matchResult.totalScore,
        matchResult.breakdown
      );
      if (resResult.success) {
        res.json({
          success: true,
          data: {
            status: 'matched',
            matchId: resResult.matchId,
            partnerSessionId: matchResult.candidateSessionId,
          },
        });
        return;
      }
    }

    res.json({
      success: true,
      data: {
        status: 'waiting',
        queuePosition: await engines.queue.getLength(),
        message: 'Finding a new partner...',
      },
    });
  }));

  // CLIENT READY HANDSHAKE
  router.post('/match/ready', asyncHandler(async (req, res) => {
    const { sessionId, sessionToken, matchId } = req.body ?? {};
    if (!sessionId || !sessionToken || !matchId) {
      res.status(400).json({ success: false, error: 'sessionId, sessionToken, and matchId are required' });
      return;
    }

    const session = await engines.session.validate(sessionId, sessionToken);
    if (!session) {
      res.status(401).json({ success: false, error: 'Invalid session credentials' });
      return;
    }

    await engines.signaling.handleReady(sessionId, matchId);
    res.json({ success: true });
  }));

  // Disconnect from active match
  router.post('/match/disconnect', asyncHandler(async (req, res) => {
    const { sessionId, sessionToken, reason } = req.body ?? {};
    if (!sessionId || !sessionToken) {
      res.status(400).json({ success: false, error: 'sessionId and sessionToken are required' });
      return;
    }

    const session = await engines.session.validate(sessionId, sessionToken);
    if (!session) {
      res.status(401).json({ success: false, error: 'Invalid session credentials' });
      return;
    }

    const validReasons = ['leave', 'disconnect', 'report'] as const;
    const endReason = validReasons.includes(reason) ? reason : 'disconnect';

    const currentMatch = await engines.db.queryOne<any>('matches', {
      filters: [
        { column: 'user_a', operator: 'eq', value: sessionId },
        { column: 'lifecycle', operator: 'neq', value: 'ended' },
        { column: 'lifecycle', operator: 'neq', value: 'cancelled' },
      ],
    }) || await engines.db.queryOne<any>('matches', {
      filters: [
        { column: 'user_b', operator: 'eq', value: sessionId },
        { column: 'lifecycle', operator: 'neq', value: 'ended' },
        { column: 'lifecycle', operator: 'neq', value: 'cancelled' },
      ],
    });

    if (currentMatch) {
      await engines.db.update('matches', [{ column: 'id', operator: 'eq', value: currentMatch.id }], {
        lifecycle: 'ended',
        ended_at: new Date().toISOString(),
        ended_reason: endReason,
      });
      const partnerId = currentMatch.user_a === sessionId ? currentMatch.user_b : currentMatch.user_a;
      await engines.session.transitionState(sessionId, 'active');
      await engines.session.transitionState(partnerId, 'active');
      await engines.signaling.signaling.sendToSession(partnerId, 'partner_left', { reason: endReason });
    }

    res.json({ success: true, message: 'Partner notified' });
  }));

  // Preferences update
  router.post('/preferences', asyncHandler(async (req, res) => {
    const { sessionId, sessionToken, preferences } = req.body ?? {};
    const session = await engines.session.validate(sessionId, sessionToken);
    if (!session) {
      res.status(401).json({ success: false, error: 'Invalid session credentials' });
      return;
    }

    await engines.session.updatePreferences(sessionId, {
      gender: preferences.gender,
      looking_for: preferences.looking_for,
      languages: preferences.languages,
      country: preferences.country,
      state: preferences.state,
      district: preferences.district,
      city: preferences.city,
      interest_tags: preferences.interest_tags,
    });

    res.json({ success: true });
  }));

  // Locations search
  router.get('/locations', asyncHandler(async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      res.json({ success: true, data: [] });
      return;
    }
    const data = await engines.db.query('locations', {
      filters: [{ column: 'name', operator: 'in', value: [query] }],
      limit: 10,
    });
    res.json({ success: true, data });
  }));

  // Interests search
  router.get('/interests', asyncHandler(async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      res.json({ success: true, data: [] });
      return;
    }
    const data = await engines.db.query('interests', {
      filters: [{ column: 'name', operator: 'in', value: [query] }],
      limit: 10,
    });
    res.json({ success: true, data });
  }));

  // Like partner
  router.post('/like', asyncHandler(async (req, res) => {
    const { sessionId, sessionToken, matchId } = req.body ?? {};
    const session = await engines.session.validate(sessionId, sessionToken);
    if (!session) {
      res.status(401).json({ success: false, error: 'Invalid session credentials' });
      return;
    }

    const result = await engines.like.submitLike(matchId, sessionId);
    res.json({
      success: true,
      data: {
        success: result.success,
        mutual: result.mutual,
      },
    });
  }));

  // Chat message
  router.post('/chat', asyncHandler(async (req, res) => {
    const { sessionId, sessionToken, matchId, message } = req.body ?? {};
    const session = await engines.session.validate(sessionId, sessionToken);
    if (!session) {
      res.status(401).json({ success: false, error: 'Invalid session credentials' });
      return;
    }

    const match = await engines.db.queryOne<any>('matches', {
      filters: [{ column: 'id', operator: 'eq', value: matchId }],
    });
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    const partnerId = match.user_a === sessionId ? match.user_b : match.user_a;

    const success = await engines.chat.sendMessage(matchId, sessionId, partnerId, message);
    res.status(201).json({ success, data: { match_id: matchId, sender_session: sessionId, message } });
  }));

  // Admin Analytics
  router.get('/analytics', asyncHandler(async (req, res) => {
    const { config } = await import('../config/index.js');
    const authHeader = req.headers.authorization;
    if (!config.adminToken || !authHeader || authHeader !== `Bearer ${config.adminToken}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const waitingCount = await engines.queue.getLength();
    const totalMatches = await engines.db.count('matches');
    const totalLikes = await engines.db.count('likes');
    const totalReports = await engines.db.count('reports');

    const sessions = await engines.db.query<any>('visitor_sessions', {
      select: ['interest_tags', 'country', 'state', 'city', 'languages'],
    });

    const interestsFreq: Record<string, number> = {};
    const locationsFreq: Record<string, number> = {};
    const languagesFreq: Record<string, number> = {};

    sessions.forEach((s: any) => {
      if (s.interest_tags) s.interest_tags.forEach((t: string) => { interestsFreq[t] = (interestsFreq[t] || 0) + 1; });
      if (s.languages) s.languages.forEach((l: string) => { languagesFreq[l] = (languagesFreq[l] || 0) + 1; });
      if (s.city) {
        locationsFreq[s.city] = (locationsFreq[s.city] || 0) + 1;
      } else if (s.country) {
        locationsFreq[s.country] = (locationsFreq[s.country] || 0) + 1;
      }
    });

    res.json({
      success: true,
      data: {
        onlineNow: waitingCount,
        totalMatches,
        totalLikes,
        totalReports,
        topInterests: Object.entries(interestsFreq).sort((a, b) => b[1] - a[1]).slice(0, 5),
        topLocations: Object.entries(locationsFreq).sort((a, b) => b[1] - a[1]).slice(0, 5),
        topLanguages: Object.entries(languagesFreq).sort((a, b) => b[1] - a[1]).slice(0, 5),
      },
    });
  }));

  return router;
}

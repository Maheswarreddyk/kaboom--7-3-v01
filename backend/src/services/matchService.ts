/**
 * @deprecated Use V2 engines instead.
 *
 * Re-exports deprecated methods as thin wrappers delegating to the engines
 * singleton to prevent any compile-time breaks.
 */

import { engines } from '../index.js';

export async function validateSession(sessionId: string, sessionToken?: string) {
  return engines.session.validate(sessionId, sessionToken);
}

export async function joinQueue(sessionId: string, sessionToken: string) {
  await engines.queue.join(sessionId);
  const matchResult = await engines.matching.findBestMatch(sessionId);
  if (matchResult) {
    const resResult = await engines.reservation.reserveAndConfirm(
      sessionId,
      matchResult.candidateSessionId,
      matchResult.totalScore,
      matchResult.breakdown
    );
    if (resResult.success) {
      return {
        status: 'matched' as const,
        matchId: resResult.matchId,
        partnerSessionId: matchResult.candidateSessionId,
        isInitiator: true,
        iceServers: [],
        queuePosition: 0,
      };
    }
  }

  return {
    status: 'waiting' as const,
    queuePosition: await engines.queue.getLength(),
  };
}

export async function leaveQueue(sessionId: string, _sessionToken: string) {
  await engines.queue.leave(sessionId);
}

export async function nextPartner(sessionId: string, _sessionToken: string) {
  await engines.queue.join(sessionId);
  return {
    status: 'waiting' as const,
    queuePosition: await engines.queue.getLength(),
  };
}

export async function notifyPartnerLeft(sessionId: string, _sessionToken: string, reason: any) {
  // Find match
  const currentMatch = await engines.db.queryOne<any>('matches', {
    filters: [
      { column: 'user_a', operator: 'eq', value: sessionId },
      { column: 'lifecycle', operator: 'neq', value: 'ended' },
    ],
  });
  if (currentMatch) {
    const partnerId = currentMatch.user_a === sessionId ? currentMatch.user_b : currentMatch.user_a;
    await engines.signaling.signaling.sendToSession(partnerId, 'partner_left', { reason });
  }
}

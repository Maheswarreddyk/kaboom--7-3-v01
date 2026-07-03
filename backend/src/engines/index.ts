/**
 * Engine Module Entry — Initializes and composes all core engines.
 *
 * Wire all engines with their port adapters and configure in-process
 * EventBus listeners for reactive decoupling.
 */

import { DatabasePort } from '../ports/DatabasePort.js';
import { SignalingPort } from '../ports/SignalingPort.js';
import { LoggerPort } from '../ports/LoggerPort.js';
import { EventBus } from '../events/EventBus.js';

import { SessionEngine } from './SessionEngine.js';
import { QueueEngine } from './QueueEngine.js';
import { ScoringEngine } from './ScoringEngine.js';
import { ReservationEngine } from './ReservationEngine.js';
import { MatchingEngine } from './MatchingEngine.js';
import { SignalingEngine } from './SignalingEngine.js';
import { ChatEngine } from './ChatEngine.js';
import { LikeEngine } from './LikeEngine.js';
import { AnalyticsEngine } from './AnalyticsEngine.js';
import { SCORING_CONFIG } from '../config/scoring.config.js';

export function createEngines(
  db: DatabasePort,
  signaling: SignalingPort,
  logger: LoggerPort,
  eventBus: EventBus
) {
  const session = new SessionEngine(db, logger, eventBus);
  const queue = new QueueEngine(db, logger, eventBus);
  const scoring = new ScoringEngine(SCORING_CONFIG);
  const reservation = new ReservationEngine(db, queue, session, logger, eventBus);
  const matching = new MatchingEngine(db, queue, scoring, session, logger);
  const signalingEngine = new SignalingEngine(signaling, db, logger, eventBus);
  const chat = new ChatEngine(db, signaling, logger, eventBus);
  const like = new LikeEngine(db, signaling, logger, eventBus);
  const analytics = new AnalyticsEngine(db, logger, eventBus);

  // Wire core signaling engine event listeners
  eventBus.on('match:reserved', (data) => signalingEngine.onMatchReserved(data));
  eventBus.on('match:failed', (data) => signalingEngine.onMatchFailed(data));
  eventBus.on('like:mutual', (data) => signalingEngine.onMutualLike(data));

  return {
    session,
    queue,
    scoring,
    reservation,
    matching,
    signaling: signalingEngine,
    chat,
    like,
    analytics,
    db,
    eventBus,
  };
}

export type Engines = ReturnType<typeof createEngines>;

export { SessionEngine } from './SessionEngine.js';
export { QueueEngine } from './QueueEngine.js';
export { ScoringEngine } from './ScoringEngine.js';
export { ReservationEngine } from './ReservationEngine.js';
export { MatchingEngine } from './MatchingEngine.js';
export { SignalingEngine } from './SignalingEngine.js';
export { ChatEngine } from './ChatEngine.js';
export { LikeEngine } from './LikeEngine.js';
export { AnalyticsEngine } from './AnalyticsEngine.js';
export { SCORING_CONFIG } from '../config/scoring.config.js';
export { USER_STATE_MACHINE, MATCH_STATE_MACHINE } from './StateMachine.js';

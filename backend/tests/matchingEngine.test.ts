/**
 * Matching Engine Unit Tests
 * Run: node --import tsx backend/tests/matchingEngine.test.ts
 */
import { strict as assert } from 'node:assert';
import { MatchingEngine } from '../src/services/matchingEngine.js';
import type { ConnectedUser } from '../src/types/index.js';

function makeUser(overrides: Partial<ConnectedUser> & { sessionId: string; socketId: string }): ConnectedUser {
  return {
    sessionId: overrides.sessionId,
    socketId: overrides.socketId,
    gender: overrides.gender,
    lookingFor: overrides.lookingFor,
    languages: overrides.languages,
    country: overrides.country,
    state: overrides.state,
    district: overrides.district,
    city: overrides.city,
    interestTags: overrides.interestTags,
    lastPartnerSessionId: overrides.lastPartnerSessionId,
    queueEnteredAt: overrides.queueEnteredAt ?? new Date(Date.now() - 30000),
    joinedQueueAt: overrides.joinedQueueAt,
    currentMatchId: overrides.currentMatchId,
    partnerSessionId: overrides.partnerSessionId,
  };
}

const engine = new MatchingEngine();
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${name}`, err instanceof Error ? err.message : err);
    failed++;
  }
}

// Reset engine state between tests
function freshEngine() {
  return new MatchingEngine();
}

test('Empty queue returns null and adds user', () => {
  const e = freshEngine();
  const user = makeUser({ sessionId: 'a', socketId: 's1' });
  const result = e.tryMatch(user);
  assert.equal(result, null);
  assert.equal(e.getQueueLength(), 1);
});

test('Two users with no preferences match after threshold', () => {
  const e = freshEngine();
  const userA = makeUser({ sessionId: 'a', socketId: 's1', queueEnteredAt: new Date(Date.now() - 95000) });
  const userB = makeUser({ sessionId: 'b', socketId: 's2', queueEnteredAt: new Date(Date.now() - 95000) });

  e.addToQueue(userB);
  const result = e.tryMatch(userA);

  assert.notEqual(result, null);
  assert.equal(result!.partner.sessionId, 'b');
  assert.equal(e.getQueueLength(), 0);
});

test('Recent partner gets penalty and may not match immediately', () => {
  const e = freshEngine();
  const userA = makeUser({
    sessionId: 'a',
    socketId: 's1',
    lastPartnerSessionId: 'b',
    queueEnteredAt: new Date(Date.now() - 5000),
  });
  const userB = makeUser({ sessionId: 'b', socketId: 's2', queueEnteredAt: new Date(Date.now() - 5000) });

  e.addToQueue(userB);
  const result = e.tryMatch(userA);

  // High threshold at 5s wait — recent partner penalty should prevent match
  assert.equal(result, null);
  assert.equal(e.getQueueLength(), 2);
});

test('Shared language increases score', () => {
  const e = freshEngine();
  const userA = makeUser({
    sessionId: 'a',
    socketId: 's1',
    languages: ['English', 'Hindi'],
    queueEnteredAt: new Date(Date.now() - 20000),
  });
  const userB = makeUser({
    sessionId: 'b',
    socketId: 's2',
    languages: ['English'],
    queueEnteredAt: new Date(Date.now() - 20000),
  });

  e.addToQueue(userB);
  const result = e.tryMatch(userA);

  assert.notEqual(result, null);
  assert.ok(result!.score > 0);
  assert.ok(result!.reason.includes('Shared Languages'));
});

test('Same city gives location bonus', () => {
  const e = freshEngine();
  const userA = makeUser({
    sessionId: 'a',
    socketId: 's1',
    city: 'Hyderabad',
    queueEnteredAt: new Date(Date.now() - 20000),
  });
  const userB = makeUser({
    sessionId: 'b',
    socketId: 's2',
    city: 'Hyderabad',
    queueEnteredAt: new Date(Date.now() - 20000),
  });

  e.addToQueue(userB);
  const result = e.tryMatch(userA);

  assert.notEqual(result, null);
  assert.ok(result!.reason.includes('Same City'));
});

test('No duplicate match — user cannot match with self', () => {
  const e = freshEngine();
  const user = makeUser({ sessionId: 'a', socketId: 's1', queueEnteredAt: new Date(Date.now() - 95000) });
  e.addToQueue(user);
  const result = e.tryMatch(user);
  assert.equal(result, null);
});

test('Unregister removes user from queue', () => {
  const e = freshEngine();
  const user = makeUser({ sessionId: 'a', socketId: 's1' });
  e.addToQueue(user);
  assert.equal(e.getQueueLength(), 1);
  e.unregisterUser('a');
  assert.equal(e.getQueueLength(), 0);
  assert.equal(e.getOnlineCount(), 0);
});

test('Progressive relaxation — longer wait lowers threshold', () => {
  const e = freshEngine();
  const userA = makeUser({ sessionId: 'a', socketId: 's1', queueEnteredAt: new Date(Date.now() - 95000) });
  const userB = makeUser({ sessionId: 'b', socketId: 's2', queueEnteredAt: new Date(Date.now() - 95000) });

  e.addToQueue(userB);
  const result = e.tryMatch(userA);

  // After 90+ seconds, any candidate is accepted
  assert.notEqual(result, null);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

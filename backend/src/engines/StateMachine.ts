/**
 * Generic State Machine with validated transitions.
 * Prevents invalid state changes across the application.
 */

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly validTargets: string[]
  ) {
    super(`Invalid state transition: ${from} → ${to}. Valid targets: [${validTargets.join(', ')}]`);
    this.name = 'InvalidTransitionError';
  }
}

export class StateMachine<S extends string> {
  private transitions: Map<S, S[]>;

  constructor(transitions: Record<S, S[]>) {
    this.transitions = new Map(Object.entries(transitions) as [S, S[]][]);
  }

  /** Check if a transition is valid */
  canTransition(current: S, to: S): boolean {
    const valid = this.transitions.get(current);
    return valid ? valid.includes(to) : false;
  }

  /** Perform a transition. Returns the new state. Throws if invalid. */
  transition(current: S, to: S): S {
    if (!this.canTransition(current, to)) {
      throw new InvalidTransitionError(current, to, this.getValidTransitions(current));
    }
    return to;
  }

  /** Get all valid transition targets from a state */
  getValidTransitions(state: S): S[] {
    return this.transitions.get(state) || [];
  }
}

// ─── Pre-configured State Machines ──────────────────────────

import type { UserState, MatchLifecycle } from '../types/index.js';

/** User lifecycle state machine */
export const USER_STATE_MACHINE = new StateMachine<UserState>({
  created:     ['active'],
  active:      ['searching', 'ended'],
  searching:   ['reserved', 'active', 'ended'],
  reserved:    ['matched', 'searching', 'ended'],
  matched:     ['negotiating', 'searching', 'ended'],
  negotiating: ['connected', 'searching', 'ended'],
  connected:   ['ended'],
  ended:       ['active'],
});

/** Match lifecycle state machine */
export const MATCH_STATE_MACHINE = new StateMachine<MatchLifecycle>({
  creating:     ['reserved'],
  reserved:     ['ready', 'cancelled'],
  ready:        ['negotiating', 'cancelled'],
  negotiating:  ['connected', 'failed'],
  connected:    ['disconnected'],
  disconnected: ['ended'],
  ended:        ['archived'],
  cancelled:    ['archived'],
  failed:       ['archived'],
  archived:     [],
});

import { getSupabase, handleSupabaseError } from '../database/client.js';
import { getIceServers } from '../config/index.js';
import { broadcastToSession } from './realtimeService.js';

export type MatchEndReason = 'next' | 'leave' | 'disconnect' | 'report';

export async function validateSession(sessionId: string, sessionToken?: string) {
  const { data, error } = await getSupabase()
    .from('visitor_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) handleSupabaseError(error, 'Failed to validate session');
  if (!data) return null;
  if (sessionToken && data.session_token !== sessionToken) return null;
  if (data.status === 'ended') return null;
  return data;
}

async function findActiveMatch(sessionId: string) {
  const { data, error } = await getSupabase()
    .from('matches')
    .select('*')
    .is('ended_at', null)
    .or(`user_a.eq.${sessionId},user_b.eq.${sessionId}`)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) handleSupabaseError(error, 'Failed to find active match');
  return data;
}

export async function endActiveMatch(sessionId: string, reason: MatchEndReason) {
  const match = await findActiveMatch(sessionId);
  if (!match) return null;

  const startedAt = new Date(match.started_at).getTime();
  const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);
  const partnerId = match.user_a === sessionId ? match.user_b : match.user_a;

  const { error } = await getSupabase()
    .from('matches')
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      ended_reason: reason,
    })
    .eq('id', match.id);

  if (error) handleSupabaseError(error, 'Failed to end match');

  await getSupabase()
    .from('connection_logs')
    .insert({
      session_id: sessionId,
      event: 'match_end',
      details: { matchId: match.id, reason },
    });

  return { match, partnerId };
}

export async function joinQueue(sessionId: string, sessionToken: string) {
  const session = await validateSession(sessionId, sessionToken);
  if (!session) {
    throw new Error('Invalid session');
  }

  const existingMatch = await findActiveMatch(sessionId);
  if (existingMatch) {
    const partnerId = existingMatch.user_a === sessionId ? existingMatch.user_b : existingMatch.user_a;
    const isInitiator = existingMatch.user_a === sessionId;
    return {
      status: 'matched' as const,
      matchId: existingMatch.id,
      partnerSessionId: partnerId,
      isInitiator,
      iceServers: getIceServers(),
      queuePosition: 0,
    };
  }

  const now = new Date().toISOString();
  let queueEnteredAt = session.queue_entered_at;

  if (!queueEnteredAt) {
    queueEnteredAt = now;
    await getSupabase()
      .from('visitor_sessions')
      .update({ queue_entered_at: queueEnteredAt, last_activity: now })
      .eq('id', sessionId);
  } else {
    await getSupabase()
      .from('visitor_sessions')
      .update({ last_activity: now })
      .eq('id', sessionId);
  }

  const waitingSeconds = Math.floor((Date.now() - new Date(queueEnteredAt).getTime()) / 1000);

  const { data: existingQueueEntry, error: queueError } = await getSupabase()
    .from('waiting_queue')
    .select('id')
    .eq('session_id', sessionId)
    .eq('status', 'waiting')
    .maybeSingle();

  if (queueError) handleSupabaseError(queueError, 'Failed to query queue status');

  if (existingQueueEntry) {
    await getSupabase()
      .from('waiting_queue')
      .update({ joined_at: now })
      .eq('id', existingQueueEntry.id);
  } else {
    await getSupabase()
      .from('waiting_queue')
      .update({ status: 'left' })
      .eq('session_id', sessionId)
      .eq('status', 'waiting');

    const { error: joinError } = await getSupabase()
      .from('waiting_queue')
      .insert({ session_id: sessionId, status: 'waiting', joined_at: now });

    if (joinError) handleSupabaseError(joinError, 'Failed to join queue');
    await getSupabase().from('visitor_sessions').update({ status: 'waiting' }).eq('id', sessionId);
    await getSupabase()
      .from('connection_logs')
      .insert({ session_id: sessionId, event: 'queue_join', details: {} });
  }

  const heartbeatThreshold = new Date(Date.now() - 12000).toISOString();

  const { data: candidates, error: candidatesError } = await getSupabase()
    .from('waiting_queue')
    .select(`
      session_id,
      joined_at,
      visitor_sessions:session_id (
        id,
        gender,
        looking_for,
        languages,
        country,
        state,
        district,
        city,
        interest_tags,
        last_partner,
        queue_entered_at,
        status
      )
    `)
    .eq('status', 'waiting')
    .neq('session_id', sessionId)
    .gte('joined_at', heartbeatThreshold);

  if (candidatesError) handleSupabaseError(candidatesError, 'Failed to query candidates');

  const [recentMatchesQuery, reportsQuery] = await Promise.all([
    getSupabase()
      .from('matches')
      .select('user_a, user_b, started_at')
      .or(`user_a.eq.${sessionId},user_b.eq.${sessionId}`)
      .order('started_at', { ascending: false })
      .limit(5),
    getSupabase()
      .from('reports')
      .select('reporter_session, reported_session')
      .or(`reporter_session.eq.${sessionId},reported_session.eq.${sessionId}`)
  ]);

  const recentPartners = new Set<string>();
  recentMatchesQuery.data?.forEach((m) => {
    recentPartners.add(m.user_a === sessionId ? m.user_b : m.user_a);
  });

  const reportedSessionIds = new Set<string>();
  reportsQuery.data?.forEach((r) => {
    reportedSessionIds.add(r.reporter_session === sessionId ? r.reported_session : r.reporter_session);
  });

  const scoredCandidates: Array<{
    sessionId: string;
    score: number;
    reason: string;
  }> = [];

  for (const entry of (candidates || [])) {
    const profile = entry.visitor_sessions as any;
    if (!profile || profile.status === 'ended') continue;

    if (reportedSessionIds.has(profile.id)) continue;
    if (profile.id === session.last_partner) continue;

    let score = 0;
    const reasons: string[] = [];

    const selfWantsPartner = !session.looking_for || 
                             session.looking_for.length === 0 || 
                             session.looking_for.includes('Anyone') || 
                             (profile.gender && session.looking_for.includes(profile.gender));
    const partnerWantsSelf = !profile.looking_for || 
                             profile.looking_for.length === 0 || 
                             profile.looking_for.includes('Anyone') || 
                             (session.gender && profile.looking_for.includes(session.gender));

    if (selfWantsPartner && partnerWantsSelf) {
      score += 50;
      reasons.push('Mutual Preference (+50)');
    }

    if (session.languages && profile.languages) {
      const sharedLangs = session.languages.filter((l: string) => profile.languages.includes(l));
      if (sharedLangs.length > 0) {
        const langScore = Math.min(sharedLangs.length * 20, 40);
        score += langScore;
        reasons.push(`Shared Languages (${sharedLangs.join(', ')}) (+${langScore})`);
      }
    }

    if (session.city && profile.city && session.city === profile.city) {
      score += 40;
      reasons.push(`Same City: ${session.city} (+40)`);
    } else if (session.district && profile.district && session.district === profile.district) {
      score += 35;
      reasons.push(`Same District: ${session.district} (+35)`);
    } else if (session.state && profile.state && session.state === profile.state) {
      score += 30;
      reasons.push(`Same State: ${session.state} (+30)`);
    } else if (session.country && profile.country && session.country === profile.country) {
      score += 20;
      reasons.push(`Same Country: ${session.country} (+20)`);
    }

    if (session.interest_tags && profile.interest_tags) {
      const sharedInterests = session.interest_tags.filter((i: string) => profile.interest_tags.includes(i));
      if (sharedInterests.length > 0) {
        const interestScore = Math.min(sharedInterests.length * 5, 40);
        score += interestScore;
        reasons.push(`Common Interests: ${sharedInterests.join(', ')} (+${interestScore})`);
      }
    }

    if (profile.queue_entered_at) {
      const candidateWait = Math.floor((Date.now() - new Date(profile.queue_entered_at).getTime()) / 1000);
      const bonus = Math.min(Math.max(candidateWait, 0), 60);
      if (bonus > 0) {
        score += bonus;
        reasons.push(`Waiting Bonus (+${bonus})`);
      }
    }

    if (recentPartners.has(profile.id)) {
      score -= 100;
      reasons.push('Matched Recently (-100)');
    }

    scoredCandidates.push({
      sessionId: profile.id,
      score,
      reason: reasons.join(', '),
    });
  }

  scoredCandidates.sort((a, b) => b.score - a.score);

  let targetCandidate: typeof scoredCandidates[0] | null = null;
  if (waitingSeconds <= 15) {
    targetCandidate = scoredCandidates.find(c => c.score > 140) || null;
  } else if (waitingSeconds <= 30) {
    targetCandidate = scoredCandidates.find(c => c.score > 110) || null;
  } else if (waitingSeconds <= 60) {
    targetCandidate = scoredCandidates.find(c => c.score > 80) || null;
  } else if (waitingSeconds <= 90) {
    targetCandidate = scoredCandidates.find(c => c.score > 50) || null;
  } else {
    targetCandidate = scoredCandidates[0] || null;
  }

  if (!targetCandidate) {
    const { count } = await getSupabase()
      .from('waiting_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting')
      .gte('joined_at', heartbeatThreshold);

    return {
      status: 'waiting' as const,
      queuePosition: count ?? 1,
      message: 'Waiting for a partner...',
    };
  }

  const partnerSessionId = targetCandidate.sessionId;

  if (sessionId > partnerSessionId) {
    const { count } = await getSupabase()
      .from('waiting_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting')
      .gte('joined_at', heartbeatThreshold);

    return {
      status: 'waiting' as const,
      queuePosition: count ?? 1,
      message: 'Waiting for a partner...',
    };
  }

  const { data: match, error: matchError } = await getSupabase()
    .from('matches')
    .insert({
      user_a: sessionId,
      user_b: partnerSessionId,
      match_score: targetCandidate.score,
      matched_reason: targetCandidate.reason,
    })
    .select()
    .single();

  if (matchError || !match) handleSupabaseError(matchError, 'Failed to create match');

  await Promise.all([
    getSupabase()
      .from('waiting_queue')
      .update({ status: 'matched' })
      .in('session_id', [sessionId, partnerSessionId])
      .eq('status', 'waiting'),
    getSupabase()
      .from('visitor_sessions')
      .update({ status: 'matched', last_partner: partnerSessionId })
      .eq('id', sessionId),
    getSupabase()
      .from('visitor_sessions')
      .update({ status: 'matched', last_partner: sessionId })
      .eq('id', partnerSessionId),
  ]);

  await getSupabase().from('connection_logs').insert([
    {
      session_id: sessionId,
      event: 'match_start',
      details: { matchId: match.id, partnerId: partnerSessionId },
    },
    {
      session_id: partnerSessionId,
      event: 'match_start',
      details: { matchId: match.id, partnerId: sessionId },
    },
  ]);

  const iceServers = getIceServers();

  await broadcastToSession(partnerSessionId, 'matched', {
    matchId: match.id,
    partnerSessionId: sessionId,
    isInitiator: false,
    iceServers,
  });

  return {
    status: 'matched' as const,
    matchId: match.id,
    partnerSessionId,
    isInitiator: true,
    iceServers,
    queuePosition: 0,
  };
}

export async function leaveQueue(sessionId: string, sessionToken: string) {
  const session = await validateSession(sessionId, sessionToken);
  if (!session) throw new Error('Invalid session');

  await getSupabase()
    .from('waiting_queue')
    .update({ status: 'left' })
    .eq('session_id', sessionId)
    .eq('status', 'waiting');

  await getSupabase().from('visitor_sessions').update({ status: 'active', queue_entered_at: null }).eq('id', sessionId);

  await getSupabase()
    .from('connection_logs')
    .insert({ session_id: sessionId, event: 'queue_leave', details: {} });
}

async function requeuePartner(partnerId: string) {
  const partner = await validateSession(partnerId);
  if (!partner) return;

  await getSupabase()
    .from('visitor_sessions')
    .update({ queue_entered_at: new Date().toISOString() })
    .eq('id', partnerId);

  await broadcastToSession(partnerId, 'searching', {
    message: 'Finding someone new...',
  });

  try {
    await joinQueue(partnerId, partner.session_token);
  } catch {
    // Partner re-queue is best-effort
  }
}

export async function nextPartner(sessionId: string, sessionToken: string) {
  const session = await validateSession(sessionId, sessionToken);
  if (!session) throw new Error('Invalid session');

  const ended = await endActiveMatch(sessionId, 'next');

  if (ended?.match?.id) {
    await getSupabase().from('temporary_messages').delete().eq('match_id', ended.match.id);
  }

  if (ended?.partnerId) {
    await broadcastToSession(ended.partnerId, 'partner_left', { reason: 'next' });
    await requeuePartner(ended.partnerId);
  }

  await getSupabase()
    .from('visitor_sessions')
    .update({ queue_entered_at: new Date().toISOString() })
    .eq('id', sessionId);

  await getSupabase()
    .from('connection_logs')
    .insert({ session_id: sessionId, event: 'next', details: {} });

  return joinQueue(sessionId, sessionToken);
}

export async function notifyPartnerLeft(sessionId: string, sessionToken: string, reason: 'leave' | 'disconnect' | 'report') {
  const session = await validateSession(sessionId, sessionToken);
  if (!session) throw new Error('Invalid session');

  const ended = await endActiveMatch(sessionId, reason);

  if (ended?.match?.id) {
    await getSupabase().from('temporary_messages').delete().eq('match_id', ended.match.id);
  }

  if (ended?.partnerId) {
    await broadcastToSession(ended.partnerId, 'partner_left', { reason });
    await requeuePartner(ended.partnerId);
  }
}

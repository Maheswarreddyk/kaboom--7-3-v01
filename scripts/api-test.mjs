/**
 * Complete API Test Suite
 * Run: node scripts/api-test.mjs
 * Env: API_URL=http://localhost:5000/api (or deployed URL)
 */
const API_URL = (process.env.API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

const results = [];

function pass(name, detail = '') {
  results.push({ name, status: 'PASS', detail });
  console.log(`✅ PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, status: 'FAIL', detail });
  console.error(`❌ FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function request(method, path, body, headers = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function testHealth() {
  const { status, data } = await request('GET', '/health');
  if (status === 200 && data.status) {
    pass('GET /health', `status=${data.status}, db=${data.database}`);
  } else {
    fail('GET /health', JSON.stringify(data));
  }
}

async function testStats() {
  const { status, data } = await request('GET', '/stats');
  if (status === 200 && data.success) {
    pass('GET /stats', `online=${data.data?.onlineNow}`);
  } else {
    fail('GET /stats', JSON.stringify(data));
  }
}

async function testLocations() {
  const { status, data } = await request('GET', '/locations?q=India');
  if (status === 200 && data.success && Array.isArray(data.data)) {
    pass('GET /locations', `count=${data.data.length}`);
  } else {
    fail('GET /locations', JSON.stringify(data));
  }
}

async function testInterests() {
  const { status, data } = await request('GET', '/interests?q=Game');
  if (status === 200 && data.success && Array.isArray(data.data)) {
    pass('GET /interests', `count=${data.data.length}`);
  } else {
    fail('GET /interests', JSON.stringify(data));
  }
}

async function testStartSession() {
  const { status, data } = await request('POST', '/start-session', {
    browser: 'TestBot', device: 'Desktop', platform: 'Test',
  });
  if ((status === 200 || status === 201) && data.data?.sessionId && data.data?.sessionToken) {
    pass('POST /start-session', `id=${data.data.sessionId.slice(0, 8)}`);
    return data.data;
  }
  fail('POST /start-session', JSON.stringify(data));
  return null;
}

async function testMatchJoin(session) {
  const { status, data } = await request('POST', '/match/join', {
    sessionId: session.sessionId,
    sessionToken: session.sessionToken,
  });
  if (status === 200 && data.success) {
    pass('POST /match/join', `status=${data.data?.status}`);
    return data.data;
  }
  fail('POST /match/join', JSON.stringify(data));
  return null;
}

async function testMatchJoinInvalid() {
  const { status } = await request('POST', '/match/join', {
    sessionId: '00000000-0000-0000-0000-000000000000',
    sessionToken: 'invalid',
  });
  if (status === 401 || status === 400) {
    pass('POST /match/join (invalid session)', `status=${status}`);
  } else {
    fail('POST /match/join (invalid session)', `expected 401, got ${status}`);
  }
}

async function testMatchJoinMissingFields() {
  const { status } = await request('POST', '/match/join', {});
  if (status === 400) {
    pass('POST /match/join (missing fields)', `status=${status}`);
  } else {
    fail('POST /match/join (missing fields)', `expected 400, got ${status}`);
  }
}

async function testPreferences(session) {
  const { status, data } = await request('POST', '/preferences', {
    sessionId: session.sessionId,
    sessionToken: session.sessionToken,
    preferences: { gender: 'Male', languages: ['English'], interest_tags: ['Gaming'] },
  });
  if (status === 200 && data.success) {
    pass('POST /preferences');
  } else {
    fail('POST /preferences', JSON.stringify(data));
  }
}

async function testMatchLeave(session) {
  const { status, data } = await request('POST', '/match/leave', {
    sessionId: session.sessionId,
    sessionToken: session.sessionToken,
  });
  if (status === 200 && data.success) {
    pass('POST /match/leave');
  } else {
    fail('POST /match/leave', JSON.stringify(data));
  }
}

async function testFeedback(session) {
  const { status, data } = await request('POST', '/feedback', {
    sessionId: session.sessionId, rating: 4, feedback: 'API test',
  });
  if ((status === 200 || status === 201) && data.success) {
    pass('POST /feedback');
  } else {
    fail('POST /feedback', JSON.stringify(data));
  }
}

async function testReport(reporter, reported) {
  const { status, data } = await request('POST', '/report', {
    reporterSessionId: reporter.sessionId,
    reportedSessionId: reported.sessionId,
    reason: 'spam',
    notes: 'API test',
  });
  if ((status === 200 || status === 201) && data.success) {
    pass('POST /report');
  } else {
    fail('POST /report', JSON.stringify(data));
  }
}

async function testEndSession(sessionId) {
  const { status, data } = await request('POST', '/end-session', { sessionId });
  if (status === 200 && data.success) {
    pass('POST /end-session');
  } else {
    fail('POST /end-session', JSON.stringify(data));
  }
}

async function test404() {
  const { status } = await request('GET', '/nonexistent-endpoint');
  if (status === 404) {
    pass('GET /nonexistent (404)');
  } else {
    fail('GET /nonexistent (404)', `got ${status}`);
  }
}

async function testMethodNotAllowed() {
  const { status } = await request('GET', '/start-session');
  if (status === 405 || status === 404) {
    pass('GET /start-session (method not allowed)', `status=${status}`);
  } else {
    fail('GET /start-session (method not allowed)', `got ${status}`);
  }
}

async function run() {
  console.log('\n========================================');
  console.log('  IndiaTV API Test Suite');
  console.log(`  Target: ${API_URL}`);
  console.log('========================================\n');

  await testHealth();
  await testStats();
  await testLocations();
  await testInterests();
  await testMatchJoinInvalid();
  await testMatchJoinMissingFields();
  await test404();
  await testMethodNotAllowed();

  const sessionA = await testStartSession();
  const sessionB = await testStartSession();

  if (sessionA) {
    await testPreferences(sessionA);
    await testMatchJoin(sessionA);
    await testMatchLeave(sessionA);
    await testFeedback(sessionA);
    await testEndSession(sessionA.sessionId);
  }

  if (sessionA && sessionB) {
    await testReport(sessionA, sessionB);
    await testEndSession(sessionB.sessionId);
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n========================================');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});

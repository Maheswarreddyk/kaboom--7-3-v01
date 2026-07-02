import { io } from 'socket.io-client';
import axios from 'axios';
import { randomUUID } from 'crypto';

const API_URL = process.env.API_URL || 'http://localhost:5000';

async function runTests() {
  console.log('🧪 Starting End-to-End Test Runner...');

  try {
    // 1. Test REST Health Check
    console.log('\n[1] Testing REST API (/health)...');
    const healthRes = await axios.get(`${API_URL}/health`);
    if (healthRes.data.status !== 'ok') throw new Error('Health check failed');
    console.log('✅ REST API is healthy');

    // Generate test sessions
    const sessionA = randomUUID();
    const tokenA = randomUUID();
    const sessionB = randomUUID();
    const tokenB = randomUUID();

    // Create clients
    const clientA = io(API_URL, { auth: { sessionId: sessionA, sessionToken: tokenA }, transports: ['websocket'] });
    const clientB = io(API_URL, { auth: { sessionId: sessionB, sessionToken: tokenB }, transports: ['websocket'] });

    await new Promise((resolve) => {
      let connected = 0;
      clientA.on('connect', () => { if (++connected === 2) resolve(); });
      clientB.on('connect', () => { if (++connected === 2) resolve(); });
    });
    console.log('\n[2] WebSockets connected successfully');

    // 2. Test Matching Loop
    console.log('\n[3] Testing Matching Engine & Queue...');
    clientA.emit('join_queue');
    
    let aMatched = false;
    let bMatched = false;
    let matchId = null;

    const matchPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Match timeout')), 5000);
      
      clientA.on('matched', (data) => {
        aMatched = true;
        matchId = data.matchId;
        if (aMatched && bMatched) { clearTimeout(timeout); resolve(); }
      });
      
      clientB.on('matched', (data) => {
        bMatched = true;
        matchId = data.matchId;
        if (aMatched && bMatched) { clearTimeout(timeout); resolve(); }
      });
    });

    setTimeout(() => {
      clientB.emit('join_queue');
    }, 500);

    await matchPromise;
    console.log('✅ Matching Engine successfully paired clients');

    // 3. Test WebRTC Signaling (Offers/Answers/ICE)
    console.log('\n[4] Testing WebRTC Signaling Relay...');
    
    const webrtcPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebRTC signaling timeout')), 5000);
      clientB.on('offer', (data) => {
        clientB.emit('answer', { targetSessionId: sessionA, answer: { type: 'answer', sdp: 'fake-sdp' } });
      });
      clientA.on('answer', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    clientA.emit('offer', { targetSessionId: sessionB, offer: { type: 'offer', sdp: 'fake-sdp' } });
    await webrtcPromise;
    console.log('✅ WebRTC signaling relayed successfully');

    // 4. Test Chat & Likes
    console.log('\n[5] Testing Chat & Mutual Likes...');
    const chatLikePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Chat/Like timeout')), 5000);
      let gotMessage = false;
      let gotMutual = false;
      
      clientB.on('new_message', (data) => {
        if (data.message === 'Hello world') gotMessage = true;
        if (gotMessage && gotMutual) { clearTimeout(timeout); resolve(); }
      });
      
      clientB.on('mutual_like', () => {
        gotMutual = true;
        if (gotMessage && gotMutual) { clearTimeout(timeout); resolve(); }
      });
      
      clientA.on('mutual_like', () => {
        // A should also get mutual like
      });
    });

    clientA.emit('chat_message', { matchId, message: 'Hello world' });
    clientA.emit('like_partner', { matchId });
    clientB.emit('like_partner', { matchId });
    
    await chatLikePromise;
    console.log('✅ Chat messages and Mutual Likes delivered successfully');

    // 5. Test Disconnect Loop
    console.log('\n[6] Testing Disconnect Loop & Requeue...');
    const disconnectPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Disconnect timeout')), 5000);
      clientB.on('partner_left', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    clientA.emit('next');
    await disconnectPromise;
    console.log('✅ Partner disconnect and next iteration handled successfully');

    clientA.disconnect();
    clientB.disconnect();

    console.log('\n🎉 All End-to-End Tests Passed Successfully!');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Test Runner Failed:', err.message);
    process.exit(1);
  }
}

runTests();

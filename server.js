/**
 * BhashaSetu - Production Server with:
 * 1. Static PWA Asset Serving
 * 2. Real-Time Zero-Knowledge E2EE Sync Relay (SSE + POST across Mobile, Tablet & Desktop)
 * 3. Human Neural TTS Audio Stream Proxy (/api/tts) for natural human voices on all devices
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

// In-memory Zero-Knowledge E2EE Room Relay
// Stores only encrypted ciphertext packets (server never sees keys or plaintext)
const syncRooms = new Map(); // roomId -> { clients: Set<res>, history: Array<encryptedPacket> }

function getOrCreateRoom(roomId) {
  const cleanId = String(roomId || 'DEFAULT').trim().toUpperCase().slice(0, 64);
  if (!syncRooms.has(cleanId)) {
    syncRooms.set(cleanId, { clients: new Set(), history: [] });
  }
  return { roomId: cleanId, room: syncRooms.get(cleanId) };
}

function broadcastPeerCount(roomId, room) {
  const countMsg = JSON.stringify({
    type: 'SERVER_PEER_COUNT',
    roomId,
    peerCount: Math.max(1, room.clients.size),
    timestamp: Date.now()
  });
  for (const client of room.clients) {
    try {
      client.write(`data: ${countMsg}\n\n`);
    } catch (_) {}
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // =========================================================================
  // 1. Real-Time E2EE Sync SSE Stream (/api/sync/stream?room=SETU-782)
  // =========================================================================
  if (pathname === '/api/sync/stream' && req.method === 'GET') {
    const { roomId, room } = getOrCreateRoom(parsedUrl.searchParams.get('room'));

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', roomId, peerCount: room.clients.size + 1 })}\n\n`);

    // Replay recent encrypted packets in this room so newly joined tablet/mobile catches up
    for (const pkt of room.history) {
      res.write(`data: ${JSON.stringify(pkt)}\n\n`);
    }

    room.clients.add(res);
    broadcastPeerCount(roomId, room);

    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (_) {}
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      room.clients.delete(res);
      broadcastPeerCount(roomId, room);
    });
    return;
  }

  // =========================================================================
  // 2. Real-Time E2EE Sync Publish Endpoint (/api/sync/publish)
  // =========================================================================
  if (pathname === '/api/sync/publish' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { roomId, room } = getOrCreateRoom(payload.roomId);
        const packet = {
          type: 'E2EE_PACKET',
          roomId,
          senderId: payload.senderId || '',
          packetId: payload.packetId || `${Date.now()}-${Math.random()}`,
          encryptedPayload: payload.encryptedPayload,
          timestamp: Date.now()
        };

        // Keep last 30 encrypted messages in ephemeral ring buffer
        if (payload.isMessage) {
          room.history.push(packet);
          if (room.history.length > 30) room.history.shift();
        }

        const serialized = `data: ${JSON.stringify(packet)}\n\n`;
        for (const client of room.clients) {
          try {
            client.write(serialized);
          } catch (_) {}
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, peers: room.clients.size }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // =========================================================================
  // 3. Human Neural TTS Audio Proxy (/api/tts?tl=hi&q=...)
  // =========================================================================
  if (pathname === '/api/tts' && req.method === 'GET') {
    const text = (parsedUrl.searchParams.get('q') || '').trim().slice(0, 200);
    const lang = (parsedUrl.searchParams.get('tl') || 'hi').trim();
    if (!text) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing text parameter q' }));
      return;
    }

    const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(text)}`;
    const proxyReq = https.get(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 5000
    }, (proxyRes) => {
      if (proxyRes.statusCode !== 200) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Upstream TTS unavailable' }));
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'TTS network error' }));
      }
    });
    return;
  }

  // =========================================================================
  // 4. Static File Server
  // =========================================================================
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const headers = {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN'
    };

    if (ext === '.html' || safePath.includes('sw.js') || ext === '.js') {
      headers['Cache-Control'] = 'no-cache';
    } else {
      headers['Cache-Control'] = 'public, max-age=86400';
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }

      res.writeHead(200, headers);
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`[BhashaSetu Server] Running on http://localhost:${PORT}`);
});

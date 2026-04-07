const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const GAME_UUID = '38611310-dbf0-4a57-9e63-67f059de973c';
const ROOT = path.join(__dirname, 'output/lands_2026-04-07T01-09-20/network');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.css':  'text/css',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ttf':  'font/ttf',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.mp3':  'audio/mpeg',
  '.ogg':  'audio/ogg',
  '.wav':  'audio/wav',
  '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  // 루트 → 게임 index.html 로 리다이렉트
  if (urlPath === '/' || urlPath === '') {
    res.writeHead(302, { Location: `/${GAME_UUID}/` });
    res.end();
    return;
  }

  // /{UUID}/ → /{UUID}/index.html
  if (urlPath === `/${GAME_UUID}` || urlPath === `/${GAME_UUID}/`) {
    urlPath = `/${GAME_UUID}/index.html`;
  }

  const filePath = path.join(ROOT, urlPath);

  // 경로 탈출 방지
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';

    // COEP/COOP 헤더 추가 (SharedArrayBuffer 필요시)
    res.writeHead(200, {
      'Content-Type': mime,
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    });
    fs.createReadStream(filePath).pipe(res);
    console.log(`[OK] ${urlPath}`);
  } else {
    console.log(`[404] ${urlPath}`);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`404 Not Found: ${urlPath}`);
  }
});

server.listen(PORT, () => {
  console.log(`\n🎮 Lands of Blight 오프라인 서버 시작!`);
  console.log(`   → http://localhost:${PORT}`);
  console.log(`   → 게임 경로: /${GAME_UUID}/\n`);
});

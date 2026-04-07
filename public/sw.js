// Service Worker: poki.com 관련 모든 네트워크 요청을 가로채서 mock 응답 반환
const POKI_DOMAINS = ['poki.com', 'poki.io', 'poki-cdn.com', 'poki.io'];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const url = e.request.url;
  const isPoki = POKI_DOMAINS.some((d) => url.includes(d));

  if (isPoki) {
    e.respondWith(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    );
  }
});

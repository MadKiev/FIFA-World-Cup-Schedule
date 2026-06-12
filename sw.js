// ⚽ World Cup 2026 PWA — Service Worker
const CACHE = 'wc2026-v1';
const SHELL = [
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
];

// ── INSTALL: cache app shell ──────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clean old caches ────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: network-first for data, cache-first for shell ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Live data feeds → network first, no caching
  if (url.hostname.includes('githubusercontent') ||
      url.hostname.includes('jsdelivr') ||
      url.hostname.includes('allorigins') ||
      url.hostname.includes('corsproxy') ||
      url.hostname.includes('anthropic')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503})));
    return;
  }

  // App shell → cache first, fall back to network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: '⚽ Match starting soon!', body: 'Open World Cup 2026 app' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'wc2026-match',
      renotify: true,
      data: { url: './' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || './'));
});

// ── BACKGROUND SYNC for match reminders ──────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'check-matches') {
    e.waitUntil(checkUpcomingMatches());
  }
});

async function checkUpcomingMatches() {
  try {
    const res = await fetch('https://cdn.jsdelivr.net/gh/openfootball/worldcup.json@master/2026/worldcup.json');
    if (!res.ok) return;
    const data = await res.json();
    const matches = data.matches || data;
    const now = Date.now();
    const KYIV = 3 * 60 * 60000;

    for (const m of matches) {
      if (!m.date || !m.time) continue;
      const utcMs = parseMatchTime(m.date, m.time);
      const diff = utcMs - now;
      // Notify 30 minutes before
      if (diff > 0 && diff < 35 * 60000) {
        const kyivTime = toKyivTime(utcMs + KYIV);
        await self.registration.showNotification(`⚽ ${m.team1} vs ${m.team2}`, {
          body: `Starts at ${kyivTime} Kyiv · ${m.ground || ''}`,
          icon: './icon-192.png',
          badge: './icon-192.png',
          vibrate: [200, 100, 200],
          tag: `match-${m.date}-${m.team1}`,
          data: { url: './' }
        });
      }
    }
  } catch (e) {}
}

function parseMatchTime(ds, ts) {
  const [y,mo,d] = ds.split('-').map(Number);
  let h=15,mi=0,off=0;
  const m = ts.match(/(\d+):(\d+)\s*UTC([+-]\d+)?/);
  if (m) { h=+m[1]; mi=+m[2]; off=m[3]?+m[3]:0; }
  return Date.UTC(y, mo-1, d, h-off, mi);
}

function toKyivTime(utcMs) {
  const d = new Date(utcMs);
  return String(d.getUTCHours()).padStart(2,'0') + ':' + String(d.getUTCMinutes()).padStart(2,'0');
}

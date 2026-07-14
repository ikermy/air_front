// Tracking utilities moved out of index.jsx
// Экспортируем trackVisitor

// Лёгкий кеш с TTL, использующий sessionStorage
const cacheWithTTL = {
  get(key) {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const { value, expires } = JSON.parse(raw);
      if (Date.now() > expires) {
        sessionStorage.removeItem(key);
        return null;
      }
      return value;
    } catch { return null; }
  },
  set(key, value, ttlMs = 1000 * 60 * 60) {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(key, JSON.stringify({ value, expires: Date.now() + ttlMs }));
    } catch {}
  }
};

const getPlatformDetailsCached = async () => {
  const cacheKey = 'platformDetails_v1';
  const cached = cacheWithTTL.get(cacheKey);
  if (cached) return cached;

  if (navigator.userAgentData) {
    try {
      const vals = await navigator.userAgentData.getHighEntropyValues([
        'platform','platformVersion','architecture','model'
      ]);
      cacheWithTTL.set(cacheKey, vals, 1000 * 60 * 60); // 1ч
      return vals;
    } catch {}
  }
  return null;
};

const getCanvasFingerprintAsync = () => {
  const cacheKey = 'canvasFingerprint_v1';
  const cached = cacheWithTTL.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  return new Promise(resolve => {
    const run = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext && canvas.getContext('2d');
        if (!ctx) return resolve(null);

        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textBaseline = 'top';
        ctx.font = '16px "Arial", sans-serif';
        ctx.fillStyle = '#111';
        ctx.fillText('Fingerprint MarusiaAI', 10, 5);
        ctx.fillStyle = 'rgba(100,150,200,0.7)';
        ctx.fillRect(10, 25, 180, 18);
        ctx.strokeStyle = 'rgb(10,100,50)';
        ctx.beginPath();
        ctx.moveTo(10, 45);
        ctx.lineTo(190, 35);
        ctx.stroke();

        const data = canvas.toDataURL();
        let hash = 2166136261 >>> 0;
        for (let i = 0; i < data.length; i++) {
          hash ^= data.charCodeAt(i);
          hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
          hash = hash >>> 0;
        }
        const res = hash.toString(16).padStart(8, '0');
        cacheWithTTL.set(cacheKey, res, 1000 * 60 * 60 * 24); // 1 день
        resolve(res);
      } catch { resolve(null); }
    };

    if (window.requestIdleCallback) {
      requestIdleCallback(run, { timeout: 500 });
    } else {
      setTimeout(run, 200);
    }
  });
};

const fetchWithTimeout = (url, opts = {}, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...opts, signal: controller.signal })
    .finally(() => clearTimeout(id));
};

const getNetworkInfo = async () => {
  const LAND_URL = window.location.origin;
  try {
    const res = await fetchWithTimeout(`/get-ip`, {}, 4000);
    const { ip } = await res.json();
    return {
      ip,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink
      } : null
    };
  } catch {
    return { ip: null, connection: null };
  }
};

// Доп. данные: viewport, pixelRatio, colorDepth, CPU/память, touch, prefers-color-scheme, tzOffset, url/path
const getExtraClientInfo = () => {
  const prefers = (q) => window.matchMedia && window.matchMedia(q).matches;
  return {
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio || 1,
    colorDepth: window.screen?.colorDepth ?? null,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    deviceMemory: navigator.deviceMemory ?? null,
    touchPoints: navigator.maxTouchPoints ?? (('ontouchstart' in window) ? 1 : 0),
    prefersColorScheme: prefers('(prefers-color-scheme: dark)') ? 'dark'
      : prefers('(prefers-color-scheme: light)') ? 'light' : 'no-preference',
    tzOffsetMinutes: new Date().getTimezoneOffset(),
    url: window.location.href,
    path: window.location.pathname
  };
};

const getUTMParams = () => {
  try {
    const p = new URLSearchParams(window.location.search);
    const keys = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
    const out = {};
    let has = false;
    keys.forEach(k => {
      const v = p.get(k);
      if (v) { out[k] = v; has = true; }
    });
    return has ? out : null;
  } catch { return null; }
};

const getSessionInfo = () => {
  if (typeof window === 'undefined') return { sessionId: null, sessionStartTs: null };
  try {
    const key = 'sessionId_v1';
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2);
      sessionStorage.setItem(key, id);
      sessionStorage.setItem('sessionStartTs', new Date().toISOString());
    }
    return { sessionId: id, sessionStartTs: sessionStorage.getItem('sessionStartTs') };
  } catch { return { sessionId: null, sessionStartTs: null }; }
};

// Быстрый SHA-256 для дедупликации полезной нагрузки
const sha256Hex = async (str) => {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  } catch { return null; }
};

// Обновлённый rate-limit: ключ на событие
const rateLimitOk = (minIntervalMs = 1000 * 60, key = 'default') => {
  if (typeof window === 'undefined') return true;
  try {
    const k = `lastTrackTs:${key}`;
    const last = Number(localStorage.getItem(k) || 0);
    if (Date.now() - last < minIntervalMs) return false;
    localStorage.setItem(k, String(Date.now()));
    return true;
  } catch { return true; }
};

const shouldSample = (rate = 1.0) => Math.random() < rate;

export const trackVisitor = async (userId, opts = {}) => {
  const {
    sampleRate = 1.0,
    minIntervalMs = 1000 * 60,
    useBeaconOnly = false,
    event = 'page_view'
  } = opts;

  if (!userId) return;

  if (!useBeaconOnly) {
    if (!shouldSample(sampleRate)) return;
    if (!rateLimitOk(minIntervalMs, event)) return;
  }

  try {
    const basic = (userId && (typeof userId === 'string' || typeof userId === 'number')) ? {
      userID: userId,
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: (navigator.userAgentData && navigator.userAgentData.platform) || (navigator.userAgent || 'Unknown'),
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookieEnabled: navigator.cookieEnabled
    } : {};

    // Сначала только кэшируемые/безсетевые данные
    const [platformDetails, canvasHash] = await Promise.all([
      getPlatformDetailsCached(),
      getCanvasFingerprintAsync()
    ]);

    const extra = getExtraClientInfo();
    const utm = getUTMParams();
    const session = getSessionInfo();

    // Формируем профиль, используемый для хеширования (без ts и без networkInfo)
    const profileForHash = {
      ...basic,
      platformDetails,
      canvasFingerprint: canvasHash,
      referrer: document.referrer,
      event,
      ...extra,
      utm,
      ...session
    };

    // Дедупликация: хеш без волатильного поля ts и без networkInfo
    const bodyForHash = JSON.stringify(profileForHash);
    const hash = await sha256Hex(bodyForHash);

    const hashKey = `lastTrackHash:${event}`;
    const lastHash = typeof window !== 'undefined' ? localStorage.getItem(hashKey) : null;
    if (!useBeaconOnly && lastHash === hash) {
      // данные не изменились — пропускаем, и здесь ещё не делали /get-ip
      return;
    }

    // Только теперь получаем networkInfo (только если будем отправлять)
    const networkInfo = await getNetworkInfo();

    // Составляем окончательный профиль с ts и networkInfo
    const profile = {
      ...profileForHash,
      ...networkInfo,
      ts: new Date().toISOString()
    };

    const body = JSON.stringify(profile);
    if (typeof window !== 'undefined' && navigator.sendBeacon) {
      const ok = navigator.sendBeacon(`/track-visitor`, new Blob([body], { type: 'application/json' }));
      if (ok) {
        try { localStorage.setItem(hashKey, hash); } catch (e) {}
        return;
      }
    }

    if (!useBeaconOnly) {
      await fetchWithTimeout(`/track-visitor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      }, 5000);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem(hashKey, hash); } catch (e) {}
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') console.error('trackVisitor error', e);
  }
};

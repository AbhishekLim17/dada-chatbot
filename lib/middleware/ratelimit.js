const rateLimiter = new Map();
const WINDOW_MS  = 60_000;

function checkRateLimit(ip, limit = 20) {
  const now  = Date.now();

  // Prune expired entries to prevent memory leaks when size grows large
  if (rateLimiter.size > 1000) {
    for (const [key, val] of rateLimiter.entries()) {
      if (now > val.resetAt) {
        rateLimiter.delete(key);
      }
    }
  }

  const rec  = rateLimiter.get(ip) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > rec.resetAt) {
    rec.count   = 0;
    rec.resetAt = now + WINDOW_MS;
  }

  rec.count++;
  rateLimiter.set(ip, rec);
  return rec.count <= limit;
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
       || req.socket?.remoteAddress
       || 'unknown';
}

module.exports = { checkRateLimit, getClientIp };

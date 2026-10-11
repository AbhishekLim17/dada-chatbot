const ALLOWED_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$|^https:\/\/(www\.)?hausofdada\.(de|online)$/;

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGIN_REGEX.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', 'https://hausofdada.online');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self';");
}

function handleCors(req, res) {
  setCors(req, res);
  
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGIN_REGEX.test(origin)) {
    return false;
  }
  return true;
}

module.exports = { handleCors, setCors, ALLOWED_ORIGIN_REGEX };

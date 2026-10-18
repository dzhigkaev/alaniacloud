// Local static server that mirrors production (S3 + CloudFront):
// - serves only what deploy.yaml uploads: index.html, assets/, resume/
// - anything else returns 403, like the private bucket behind OAC
// - sends the CloudFront response-headers policy (HSTS skipped on localhost)
//
// Usage: node tests/serve.js   (PORT env var, default 4321)

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4321;

const HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
    "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'; object-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  'Cache-Control': 'no-cache',
};

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

function deployed(rel) {
  return rel === 'index.html' || rel.startsWith('assets/') || rel.startsWith('resume/');
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, HEADERS).end();
    return;
  }

  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '');
  } catch {
    res.writeHead(400, HEADERS).end();
    return;
  }
  if (rel === '') rel = 'index.html';

  const file = path.join(ROOT, rel);
  const inside = file.startsWith(ROOT + path.sep);
  const hidden = rel.split('/').some((part) => part.startsWith('.'));

  if (!inside || hidden || !deployed(rel) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(403, { ...HEADERS, 'Content-Type': 'text/plain' }).end('403 Forbidden');
    return;
  }

  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { ...HEADERS, 'Content-Type': type, 'Content-Length': fs.statSync(file).size });
  if (req.method === 'HEAD') res.end();
  else fs.createReadStream(file).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Serving ${ROOT} at http://127.0.0.1:${PORT}`);
});

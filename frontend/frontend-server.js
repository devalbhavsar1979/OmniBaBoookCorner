// Serves the React production build as a static SPA on port 7000.
// Uses only Node.js built-in modules — no npm dependencies required.
const http = require('http');
const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, 'build');
const PORT = 7000;
const HOST = '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.webmanifest': 'application/manifest+json',
};

const INDEX = path.join(BUILD_DIR, 'index.html');

http.createServer((req, res) => {
  // Strip query string
  const urlPath = req.url.split('?')[0];
  const filePath = path.join(BUILD_DIR, urlPath);
  const ext = path.extname(filePath).toLowerCase();

  // Serve the file if it exists and has a known extension (asset)
  if (ext && fs.existsSync(filePath)) {
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // All other routes fall back to index.html (SPA client-side routing)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(INDEX).pipe(res);
  }
}).listen(PORT, HOST, () => {
  console.log(`Ba Book Corner frontend running at http://${HOST}:${PORT}`);
});

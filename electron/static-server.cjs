// Minimal, dependency-free static file server used by the Electron wrapper.
//
// The built game is a static Vite bundle that uses `<script type="module">`
// and fetch()es .glb / .png assets. Chromium blocks both of those over the
// file:// protocol (CORS), so instead of loading files directly we serve the
// build over http://127.0.0.1:<random-port> and point the window at it. This
// gives byte-for-byte parity with `vite preview` / the real browser.
//
// Kept dependency-free on purpose: it works identically inside an asar archive
// (Electron patches fs to read asar) and adds nothing to the bundle.

const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function contentType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

// Resolve a request URL to a file inside `root`, rejecting path traversal.
function resolvePath(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const rel = decoded.replace(/^\/+/, '');
  const target = path.join(root, rel);
  const normalizedRoot = path.resolve(root);
  const normalizedTarget = path.resolve(target);
  if (normalizedTarget !== normalizedRoot &&
      !normalizedTarget.startsWith(normalizedRoot + path.sep)) {
    return null; // escaped the root
  }
  return normalizedTarget;
}

// Start serving `root` on 127.0.0.1. Returns a promise resolving to
// { server, port, url }. Port 0 lets the OS pick a free port.
function startServer(root, { port = 0, host = '127.0.0.1' } = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let filePath = resolvePath(root, req.url || '/');
      if (!filePath) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.stat(filePath, (err, stat) => {
        if (!err && stat.isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }
        fs.readFile(filePath, (readErr, data) => {
          if (readErr) {
            // SPA-ish fallback: unknown route -> index.html (keeps deep links working)
            fs.readFile(path.join(root, 'index.html'), (fallbackErr, indexData) => {
              if (fallbackErr) {
                res.writeHead(404);
                res.end('Not found');
              } else {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(indexData);
              }
            });
            return;
          }
          res.writeHead(200, {
            'Content-Type': contentType(filePath),
            'Cache-Control': 'no-cache',
          });
          res.end(data);
        });
      });
    });

    server.on('error', reject);
    server.listen(port, host, () => {
      const actualPort = server.address().port;
      resolve({ server, port: actualPort, url: `http://${host}:${actualPort}/` });
    });
  });
}

module.exports = { startServer, contentType, resolvePath };

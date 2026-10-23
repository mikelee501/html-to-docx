const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

const PORT = process.env.PORT || 3000;
// Largest HTML body accepted (default 20 MB)
const MAX_BYTES = parseInt(process.env.MAX_BODY_BYTES || String(20 * 1024 * 1024), 10);
// pandoc is killed if it takes longer than this (default 60 s)
const TIMEOUT_MS = parseInt(process.env.PANDOC_TIMEOUT_MS || '60000', 10);
// --sandbox stops pandoc from reading local files or fetching URLs referenced in the HTML
// (otherwise <img src="/etc/passwd"> or <img src="http://internal-host/..."> ends up inside the DOCX).
// Set ALLOW_REMOTE_RESOURCES=1 only if documents must embed images from URLs.
const SANDBOX = process.env.ALLOW_REMOTE_RESOURCES !== '1';

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.end('HTML to DOCX converter ready');
    return;
  }

  const chunks = [];
  let size = 0;
  let aborted = false;
  req.on('data', chunk => {
    if (aborted) return;
    size += chunk.length;
    if (size > MAX_BYTES) {
      aborted = true;
      res.writeHead(413);
      res.end('Request body too large');
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    if (aborted) return;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'h2d-'));
    const input = path.join(dir, 'in.html');
    const output = path.join(dir, 'out.docx');
    const cleanup = () => fs.rm(dir, { recursive: true, force: true }, () => {});
    try {
      fs.writeFileSync(input, Buffer.concat(chunks));
    } catch (err) {
      cleanup();
      res.writeHead(500);
      res.end(err.message);
      return;
    }
    const args = [...(SANDBOX ? ['--sandbox'] : []), input, '-o', output];
    execFile('pandoc', args, { timeout: TIMEOUT_MS, cwd: dir }, (err, stdout, stderr) => {
      if (err) {
        cleanup();
        res.writeHead(500);
        res.end(err.killed ? 'Conversion timed out' : (stderr || err.message));
        return;
      }
      fs.readFile(output, (readErr, docx) => {
        cleanup();
        if (readErr) {
          res.writeHead(500);
          res.end(readErr.message);
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.end(docx);
      });
    });
  });
});

server.listen(PORT, () => console.log('Running on ' + PORT + (SANDBOX ? ' (pandoc sandbox on)' : ' (pandoc sandbox OFF)')));

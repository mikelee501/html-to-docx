const http = require('http');
const fs = require('fs');
const { execSync } = require('child_process');

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const id = Date.now();
        fs.writeFileSync('/tmp/' + id + '.html', Buffer.concat(chunks));
        execSync('pandoc /tmp/' + id + '.html -o /tmp/' + id + '.docx');
        const docx = fs.readFileSync('/tmp/' + id + '.docx');
        fs.unlinkSync('/tmp/' + id + '.html');
        fs.unlinkSync('/tmp/' + id + '.docx');
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.end(docx);
      } catch (err) {
        res.writeHead(500);
        res.end(err.message);
      }
    });
  } else {
    res.end('HTML to DOCX converter ready');
  }
});

server.listen(3000, () => console.log('Running on 3000'));

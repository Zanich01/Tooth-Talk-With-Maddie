const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const engine = require('./assets/js/dental-engine.js');
const root = __dirname;
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
function createServer({ answers, products = [], publicFiles }) {
  let recentRequests = 0;
  let windowStart = Date.now();
  function json(res, status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify(body));
  }
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/health' && req.method === 'GET') return json(res, 200, { engine: 'dental-intents', available: true });
      if (url.pathname === '/api/answer') {
        if (req.method !== 'POST') return json(res, 405, { error: 'Use POST' });
        if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return json(res, 403, { error: 'Origin not allowed' });
        if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'Use application/json' });
        if (Date.now() - windowStart >= 60000) { windowStart = Date.now(); recentRequests = 0; }
        if (++recentRequests > 120) return json(res, 429, { error: 'Try again shortly' });
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 4096) return json(res, 413, { error: 'Request too large' });
        }
        let data;
        try { data = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
        if (typeof data.question !== 'string' || !data.question.trim() || data.question.length > 500) return json(res, 400, { error: 'Enter a question of 1–500 characters' });
        const context = typeof data.context?.lastIntent === 'string' ? {
          lastIntent: data.context.lastIntent.slice(0, 80),
          productGroup: typeof data.context.productGroup === 'string' ? data.context.productGroup.slice(0, 80) : undefined,
          pending: data.context.pending === 'product-options' ? 'product-options' : undefined,
          productNames: Array.isArray(data.context.productNames) ? data.context.productNames.filter(name => typeof name === 'string').slice(0, 4) : []
        } : {};
        // No request text is logged or written to disk. Context belongs to the browser session.
        return json(res, 200, engine.resolve(data.question.trim(), answers, context, products));
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Method not allowed' });
      const file = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
      if (!publicFiles.has(file)) return json(res, 404, { error: 'Not found' });
      const content = await fs.readFile(path.join(root, file));
      res.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch {
      json(res, 400, { error: 'Unable to process request' });
    }
  });
}
async function loadApplication() {
  const answers = JSON.parse(await fs.readFile(path.join(root, 'data/answers.json'), 'utf8'));
  const products = JSON.parse(await fs.readFile(path.join(root, 'data/products.json'), 'utf8'));
  const publicFiles = new Set((await fs.readdir(root)).filter(file => file.endsWith('.html')));
  async function addDirectory(directory) {
    for (const item of await fs.readdir(path.join(root, directory), { withFileTypes: true })) {
      const file = `${directory}/${item.name}`;
      if (item.isDirectory()) await addDirectory(file);
      else if (item.isFile() && mime[path.extname(file).toLowerCase()]) publicFiles.add(file);
    }
  }
  await addDirectory('assets');
  for (const name of ['answers.json', 'products.json', 'topics.json']) publicFiles.add(`data/${name}`);
  return { answers, products, publicFiles };
}
if (require.main === module) {
  loadApplication().then(application => {
    const port = Number(process.env.PORT || 8000);
    const server = createServer(application);
    server.on('error', error => { console.error(`Could not start preview: ${error.code}`); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => console.log(`Dental guide backend running at http://127.0.0.1:${port}`));
  }).catch(() => { console.error('Unable to load the answer library'); process.exitCode = 1; });
}
module.exports = { createServer, loadApplication };

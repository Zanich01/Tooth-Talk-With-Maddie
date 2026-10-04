const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer, loadApplication } = require('../server.cjs');
async function main() {
  const application = await loadApplication();
  const server = createServer(application);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (body, headers = {}) => fetch(`${base}/api/answer`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body)
  });
  try {
    const result = await post({ question: 'What are some questions I should ask at my next dental visit?' });
    assert.equal(result.status, 200);
    const answer = await result.json();
    assert.equal(answer.entries[0].id, 'visit-questions');
    assert.equal(answer.entries[0].bullets.length, 5);
    const contextual = await post({ question: 'It is an adult tooth', context: { lastIntent: 'loose-tooth' } });
    assert.equal((await contextual.json()).entries[0].id, 'loose-adult');
    assert.equal((await post({ question: '' })).status, 400);
    assert.equal((await post({ question: 'x'.repeat(501) })).status, 400);
    assert.equal((await post({ question: 'x'.repeat(5000) })).status, 413);
    assert.equal((await post({ question: 'hello' }, { Origin: 'https://unrelated.example' })).status, 403);
    assert.equal((await fetch(`${base}/api/answer`)).status, 405);
    assert.equal((await fetch(`${base}/server.cjs`)).status, 404);
    assert.equal((await fetch(`${base}/.git/config`)).status, 404);
    assert.equal((await fetch(`${base}/README.md`)).status, 404);
    assert.equal((await fetch(`${base}/questions.html`)).status, 200);
    assert.equal((await fetch(`${base}/assets/js/dental-engine.js`)).status, 200);
    console.log('PASS backend answers, context, validation, origin checks, and public-file boundaries');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

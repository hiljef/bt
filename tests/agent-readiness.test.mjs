import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { runInNewContext } from 'node:vm';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

let server;
let base;

before(async () => {
  const listener = createServer();
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['dist/server/entry.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
    stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error('Production server exited during startup');
    try {
      await fetch(base);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error('Production server did not start');
});

after(() => server?.kill());

test('discovery files, sitemap pages and metadata are served', async () => {
  const robots = await (await fetch(`${base}/robots.txt`)).text();
  assert.match(robots, /Content-Signal: search=yes, ai-train=no/);
  assert.match(robots, /Sitemap: https:\/\/berlintune\.com\/sitemap\.xml/);
  assert.equal((await fetch(`${base}/llms.txt`)).status, 200);

  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(locations.sort(), [
    'https://berlintune.com/', 'https://berlintune.com/credits/', 'https://berlintune.com/info/', 'https://berlintune.com/legal/',
    'https://berlintune.com/live/', 'https://berlintune.com/music/', 'https://berlintune.com/news/',
    'https://berlintune.com/posts/post-1/',
  ].sort());
  for (const location of locations) {
    const page = await fetch(base + new URL(location).pathname);
    assert.equal(page.status, 200, location);
    const html = await page.text();
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]+"/);
    assert.ok(html.includes(`rel="canonical" href="${location}"`), location);
  }
});

test('pages expose consistent SEO metadata and meaningful headings', async () => {
  const paths = ['/', '/info/', '/music/', '/live/', '/news/', '/legal/', '/posts/post-1/'];
  const titles = new Set();
  for (const path of paths) {
    const html = await (await fetch(base + path)).text();
    const title = html.match(/<title>([^<]+)<\/title>/)[1];
    titles.add(title);
    assert.match(html, /<h1(?:\s[^>]*)?>\s*[^<\s][^<]*<\/h1>/);
    assert.ok(html.includes(`property="og:title" content="${title}"`));
    assert.ok(html.includes(`property="og:url" content="https://berlintune.com${path}"`));
    assert.match(html, /property="og:description" content="[^"]+"/);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
  }
  assert.equal(titles.size, paths.length);

  const home = await (await fetch(base)).text();
  assert.match(home, /<title>Music Studio in Berlin \| berlintune studio<\/title>/);
  assert.match(home, /<meta name="description" content="Berlin-based studio run by Hilary Jeffery and Eleni Poulou/);
  assert.match(home, /<h1[^>]*>berlintune studio<\/h1>/);
  assert.match(home, /alt="Fake Lake by Organza Ray cover artwork"/);
  const socialImageUrl = home.match(/<meta property="og:image" content="([^"]+)"/)[1];
  assert.match(home, /property="og:image:alt" content="Fake Lake by Organza Ray cover artwork"/);
  assert.match(home, /name="twitter:image" content="[^"]+"/);
  const socialImage = new URL(socialImageUrl);
  assert.equal((await fetch(new URL(`${socialImage.pathname}${socialImage.search}`, base))).status, 200);
  const music = await (await fetch(`${base}/music`)).text();
  assert.match(music, /rel="canonical" href="https:\/\/berlintune\.com\/music\/"/);
  const live = await (await fetch(`${base}/live/`)).text();
  assert.match(live, /loading="lazy"/);
  assert.match(live, /<h4(?:\s[^>]*)?>Venue<\/h4>/, 'event venues should follow event headings');
});

test('homepage negotiates Markdown and exposes structured data and WebMCP', async () => {
  const htmlResponse = await fetch(base);
  assert.match(htmlResponse.headers.get('link'), /\/llms\.txt/);
  assert.match(htmlResponse.headers.get('vary'), /Accept/i);
  const html = await htmlResponse.text();
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
  assert.ok(schema['@graph'].some((item) => item['@type'] === 'Organization' && item.sameAs.length && item.email));
  assert.ok(schema['@graph'].some((item) => item['@type'] === 'WebSite'));
  assert.ok(schema['@graph'].some((item) => item['@type'] === 'MusicAlbum'));

  const markdown = await fetch(base, { headers: { Accept: 'text/markdown' } });
  assert.match(markdown.headers.get('content-type'), /^text\/markdown/);
  assert.equal(await markdown.text(), await (await fetch(`${base}/index.md`)).text());
  for (const accept of ['text/markdown;q=0', 'text/html;q=1, text/markdown;q=0.1']) {
    assert.match((await fetch(base, { headers: { Accept: accept } })).headers.get('content-type'), /^text\/html/);
  }

  const script = [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1]).find((text) => text.includes('navigator.modelContext'));
  let tool;
  runInNewContext(script, {
    navigator: { modelContext: { registerTool: (registration) => { tool = registration; } } },
    fetch: () => fetch(`${base}/index.md`),
  });
  assert.equal(tool.name, 'get_site_information');
  assert.match((await tool.execute()).content[0].text, /berlintune studio/);
});

test('MCP card describes a working read-only tool', async () => {
  const cardResponse = await fetch(`${base}/.well-known/mcp/server-card.json`);
  assert.equal(cardResponse.headers.get('access-control-allow-origin'), '*');
  const card = await cardResponse.json();
  assert.equal(card.transport.endpoint, 'https://berlintune.com/mcp');
  const client = new Client({ name: 'agent-readiness-test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
  try {
    const tools = await client.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === card.tools[0].name));
    const result = await client.callTool({ name: card.tools[0].name, arguments: {} });
    assert.match(result.content[0].text, /berlintune studio/);
  } finally {
    await client.close();
  }
  const rejected = await fetch(`${base}/mcp`, {
    method: 'POST', headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(rejected.status, 403);
});

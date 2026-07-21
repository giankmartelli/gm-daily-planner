import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'

const distDir = new URL('../dist/', import.meta.url)
const serverDir = new URL('../dist/server/', import.meta.url)

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name === 'server') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await collectFiles(path)))
    else files.push(path)
  }
  return files
}

const distPath = distDir.pathname
const files = await collectFiles(distPath)
const assets = {}

for (const file of files) {
  const route = `/${relative(distPath, file).split(sep).join('/')}`
  assets[route] = {
    body: (await readFile(file)).toString('base64'),
    type: mimeTypes[extname(file)] ?? 'application/octet-stream',
  }
}

const worker = `const assets = ${JSON.stringify(assets)};
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; manifest-src 'self'; worker-src 'self' blob:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
function decode(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}
export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405, headers: securityHeaders });
    }
    const url = new URL(request.url);
    let asset = assets[url.pathname];
    if (!asset && !url.pathname.includes('.')) asset = assets['/index.html'];
    if (!asset) return new Response('Not Found', { status: 404, headers: securityHeaders });
    const headers = new Headers(securityHeaders);
    headers.set('Content-Type', asset.type);
    headers.set('Cache-Control', url.pathname === '/index.html' || !url.pathname.includes('.') ? 'no-cache' : 'public, max-age=31536000, immutable');
    return new Response(request.method === 'HEAD' ? null : decode(asset.body), { status: 200, headers });
  },
};
`

await mkdir(serverDir, { recursive: true })
await writeFile(new URL('../dist/server/index.js', import.meta.url), worker)
console.log(`Worker de publicación generado con ${files.length} recursos.`)

/**
 * Serves ./data over HTTP for local app development, e.g.
 *   EXPO_PUBLIC_DATA_BASE_URL=http://localhost:8787/v1
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../data');
const port = Number(process.env.PORT ?? 8787);

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  const file = path.join(root, pathname);
  if (!file.startsWith(root + path.sep) || !file.endsWith('.json')) {
    response.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }).end(body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}`));

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

process.env.SESSION_SECRET = 'r'.repeat(32);

const ROOT = join(process.cwd(), 'src/app/api/admin');
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? routeFiles(full) : name === 'route.ts' ? [full] : [];
  });
}

const files = routeFiles(ROOT);

test('there is at least one admin route to check', () => {
  assert.ok(files.length > 0);
});

for (const file of files) {
  const label = relative(process.cwd(), file);

  test(`${label}: every handler answers 401 to a request with no session`, async () => {
    const routeModule = (await import(file)) as Record<string, unknown>;
    const handlers = METHODS.filter((m) => typeof routeModule[m] === 'function');
    assert.ok(handlers.length > 0, 'route exports no handlers');
    for (const method of handlers) {
      const handler = routeModule[method] as (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
      const response = await handler(new Request('https://example.com/api/admin/x', { method }), { params: Promise.resolve({ id: 'x' }) });
      assert.equal(response.status, 401, `${method} must not run without a session`);
    }
  });
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Server actions are public HTTP endpoints. Middleware turns away signed-out visitors, but every action must also
// check the session itself. This test finds every server-actions file under src/app/admin and checks that each
// exported function calls requireAdmin() before it does anything else.

const ROOT = join(process.cwd(), 'src/app/admin');
const EXEMPT = new Set(['src/app/admin/login/actions.ts']); // sign in / sign out are how a session starts and ends

function actionFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return actionFiles(full);
    return /actions?\.ts$/.test(name) && readFileSync(full, 'utf8').trimStart().startsWith("'use server'") ? [full] : [];
  });
}

const files = actionFiles(ROOT).filter((f) => !EXEMPT.has(relative(process.cwd(), f)));

test('there is at least one server-actions file to check', () => {
  assert.ok(files.length > 0);
});

for (const file of files) {
  test(`${relative(process.cwd(), file)}: every exported action starts with requireAdmin()`, () => {
    const source = readFileSync(file, 'utf8');
    // A signature is expected on one line ending in "{" (return types may contain braces themselves).
    const exported = [...source.matchAll(/export async function (\w+)[^\n]*\{\n/g)];
    assert.ok(exported.length > 0, 'file exports no async functions');
    for (const match of exported) {
      const body = source.slice(match.index! + match[0].length);
      const firstStatement = body.trimStart().split('\n')[0];
      assert.match(firstStatement, /await requireAdmin\(\)/, `${match[1]} must begin with "await requireAdmin();"`);
    }
  });
}

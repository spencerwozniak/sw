import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

/** Run `npm run admin:hash` with the given piped stdin (no TTY, so the prompts just read lines). */
function runHashScript(input: string) {
  return spawnSync(process.execPath, ['--import', 'tsx', join(process.cwd(), 'scripts/hash-password.ts')], { input, encoding: 'utf8' });
}

const BANNER = /Add these to Vercel/;

test('admin:hash prints the Vercel instructions and both values for an accepted password', () => {
  const result = runHashScript('correct horse battery staple\ncorrect horse battery staple\n');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, BANNER);
  assert.match(result.stdout, /^ADMIN_PASSWORD_HASH=scrypt:\d+:\d+:\d+:[\w-]+:[\w-]+$/m);
  assert.match(result.stdout, /^SESSION_SECRET=[0-9a-f]{64}$/m);
  assert.ok(!result.stdout.includes('correct horse battery staple'), 'the password is never printed');
});

test('admin:hash prints no instructions when the password is rejected', () => {
  for (const [label, input] of [
    ['too short', 'short\nshort\n'],
    ['empty', ''],
    ['not repeated correctly', 'correct horse battery staple\nsomething else entirely\n'],
  ]) {
    const result = runHashScript(input);
    assert.equal(result.status, 1, label);
    assert.match(result.stderr, /^FAIL: /m, label);
    assert.doesNotMatch(result.stdout, BANNER, `${label}: no banner`);
    assert.doesNotMatch(result.stdout, /ADMIN_PASSWORD_HASH|SESSION_SECRET/, `${label}: no values`);
  }
});

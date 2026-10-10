import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertThrowawayDatabase } from '../../scripts/browser/test-database.mjs';

const TEST_DB = 'postgresql://postgres:postgres@127.0.0.1:54329/swtest';
const PRODUCTION_DB = 'postgresql://owner:hunter2@db.example.com:5432/production';
const PORT = '3197';

test('the browser checks accept the throwaway database and nothing else', () => {
  assert.equal(assertThrowawayDatabase(TEST_DB), TEST_DB);
  assert.equal(assertThrowawayDatabase('postgresql://postgres:postgres@localhost:54329/swtest'), 'postgresql://postgres:postgres@localhost:54329/swtest');
  for (const url of [PRODUCTION_DB, 'postgresql://postgres:postgres@127.0.0.1:54330/swdev', 'postgresql://postgres:postgres@127.0.0.1:54329/other', '', undefined]) {
    assert.throws(() => assertThrowawayDatabase(url), /not the throwaway test database/, String(url));
  }
});

test('the refusal never prints the URL it refused', () => {
  assert.throws(() => assertThrowawayDatabase(PRODUCTION_DB), (error: Error) => !/hunter2|example\.com/.test(error.message));
});

/** A throwaway git repo with the files verify-build.sh reads, and fake npx/curl that log the environment they see. */
function fakeProject(envVerify: string) {
  const home = mkdtempSync(join(tmpdir(), 'sw-verify-test-'));
  const repo = join(home, 'repo');
  const bin = join(home, 'bin');
  mkdirSync(repo);
  mkdirSync(bin);
  writeFileSync(join(repo, 'package.json'), '{}');
  writeFileSync(join(repo, '.env.example'), 'DATABASE_URL=\nBLOB_PUBLIC_TOKEN=\nSESSION_SECRET=\n');
  writeFileSync(join(repo, '.env.verify'), envVerify); // untracked, like the real one
  const git = (...args: string[]) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd: repo });
  git('init', '-q');
  git('add', 'package.json', '.env.example');
  git('commit', '-q', '-m', 'init');
  writeFileSync(join(bin, 'npx'), '#!/usr/bin/env bash\nprintf "%s|DATABASE_URL=%s|BLOB_PUBLIC_TOKEN=%s\\n" "$*" "${DATABASE_URL-unset}" "${BLOB_PUBLIC_TOKEN-unset}" >> "$FAKE_LOG"\n');
  writeFileSync(join(bin, 'curl'), '#!/usr/bin/env bash\nexit 0\n');
  chmodSync(join(bin, 'npx'), 0o755);
  chmodSync(join(bin, 'curl'), 0o755);
  const log = join(home, 'npx.log');
  const start = () =>
    spawnSync('bash', [join(process.cwd(), 'scripts/verify-build.sh'), 'start', PORT], {
      cwd: repo,
      encoding: 'utf8',
      // The shell the owner ran `npm run db:deploy` in: production values are exported.
      env: { ...process.env, HOME: home, PATH: `${bin}:${process.env.PATH}`, FAKE_LOG: log, DATABASE_URL: PRODUCTION_DB, BLOB_PUBLIC_TOKEN: 'real-blob-token' },
    });
  return { home, log, start };
}

test('verify:start builds and serves without any variable from the shell leaking in', () => {
  const { home, log, start } = fakeProject(`DATABASE_URL=${TEST_DB}\nSESSION_SECRET=test-only\n`);
  try {
    const result = start();
    assert.equal(result.status, 0, result.stderr);
    const calls = readFileSync(log, 'utf8').trim().split('\n');
    assert.ok(calls.some((c) => c.startsWith('next build')), 'the build ran');
    assert.ok(calls.some((c) => c.startsWith(`next start -p ${PORT}`)), 'the server started');
    // The build accepts a publicly documented admin password, so it must listen on loopback only.
    const startCall = calls.find((c) => c.startsWith('next start'))!;
    assert.match(startCall.split('|')[0], / -H 127\.0\.0\.1$/, 'the server binds to 127.0.0.1 only');
    for (const call of calls) assert.match(call, /\|DATABASE_URL=unset\|BLOB_PUBLIC_TOKEN=unset$/, `the shell's variables must not reach: ${call}`);
    // With the shell's value gone, Next reads the test database from .env.local.
    assert.match(readFileSync(join(home, '.cache', `sw-verify-${PORT}`, '.env.local'), 'utf8'), /^DATABASE_URL=postgresql:\/\/postgres:postgres@127\.0\.0\.1:54329\/swtest$/m);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('verify:start refuses a .env.verify that does not point at the throwaway database', () => {
  const { home, log, start } = fakeProject(`DATABASE_URL=${PRODUCTION_DB}\n`);
  try {
    const result = start();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /not the throwaway test database/);
    assert.ok(!/hunter2|example\.com/.test(result.stderr + result.stdout), 'the URL is not printed');
    assert.ok(!existsSync(log), 'nothing was built');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

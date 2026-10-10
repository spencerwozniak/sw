// Usage: npm run admin:hash
// Prompts (without echo) for the admin password and prints the two values to put in
// Vercel and .env.local. Nothing is written to disk. Needs macOS or Linux for the
// hidden prompt (it uses `stty`); with piped input it just reads the lines.
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import readline from 'node:readline';
import { MIN_PASSWORD_LENGTH, hashPassword } from '@/lib/admin/password';

function setEcho(on: boolean) {
  if (!process.stdin.isTTY) return;
  try {
    execSync(on ? 'stty echo' : 'stty -echo', { stdio: 'inherit' });
  } catch {
    // No stty available: the prompt still works, it just echoes.
  }
}

async function main() {
  const lines = readline.createInterface({ input: process.stdin })[Symbol.asyncIterator]();
  const ask = async (question: string) => {
    process.stdout.write(question);
    setEcho(false);
    try {
      return (await lines.next()).value ?? '';
    } finally {
      setEcho(true);
      process.stdout.write('\n');
    }
  };

  const first = await ask(`Admin password (at least ${MIN_PASSWORD_LENGTH} characters): `);
  const second = await ask('Repeat it: ');
  if (first !== second) throw new Error('The passwords do not match.');
  console.log('\nAdd these to Vercel (Production and Preview) and to .env.local:\n');
  console.log(`ADMIN_PASSWORD_HASH=${await hashPassword(first)}`);
  console.log(`SESSION_SECRET=${randomBytes(32).toString('hex')}\n`);
  console.log('Rotating SESSION_SECRET signs everyone out. Keep both values private.');
  process.exit(0);
}

main().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

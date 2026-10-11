// Usage: npm run blob:check   (reads .env.local)
// Proves both Blob stores work AND that private blobs are really private.
import { deleteBlobs, getPrivateBlob, putBlob } from '@/lib/blob';

let failed = false;
const report = (ok: boolean, label: string, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed = true;
};

async function main() {
  const stamp = `${Date.now()}`;

  const pub = await putBlob('public', `healthcheck/${stamp}.txt`, 'public ok', { contentType: 'text/plain' });
  const pubFetch = await fetch(pub.url);
  report(pubFetch.status === 200 && (await pubFetch.text()) === 'public ok', 'public store: write and read by URL');
  await deleteBlobs('public', [pub.url]);

  const priv = await putBlob('private', `healthcheck/${stamp}.txt`, 'private ok', { contentType: 'text/plain' });
  const viaToken = await getPrivateBlob(priv.pathname);
  report(!!viaToken && (await new Response(viaToken.stream).text()) === 'private ok', 'private store: write and read with the token');
  const anonymous = await fetch(priv.url);
  report(anonymous.status === 401 || anonymous.status === 403 || anonymous.status === 404, 'private store: NOT readable without the token', `anonymous fetch returned ${anonymous.status}`);
  await deleteBlobs('private', [priv.pathname]);
}

main()
  .catch((error) => report(false, 'unexpected error', error instanceof Error ? error.message : String(error)))
  .finally(() => process.exit(failed ? 1 : 0));

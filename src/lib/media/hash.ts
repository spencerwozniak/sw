// Content hashes used to skip files that were already uploaded. Runs in the browser.

export const PARTIAL_HASH_BYTES = 8 * 1024 * 1024;

export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const view = data instanceof Uint8Array ? data : new Uint8Array(data);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', view as Uint8Array<ArrayBuffer>));
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Photos: the sha-256 of the whole file. Videos can be 300 MB, which a phone cannot
 * comfortably hold in memory, so they hash their size plus the first and last 8 MB
 * (`v1:<size>:<sha-256>`). A change confined to the middle of a long video would not
 * be noticed; that is an accepted trade-off for duplicate detection.
 */
export async function hashBlob(blob: Blob, kind: 'PHOTO' | 'VIDEO'): Promise<string> {
  if (kind === 'PHOTO') return sha256Hex(await blob.arrayBuffer());
  const head = new Uint8Array(await blob.slice(0, PARTIAL_HASH_BYTES).arrayBuffer());
  const tailStart = Math.max(PARTIAL_HASH_BYTES, blob.size - PARTIAL_HASH_BYTES);
  const tail = new Uint8Array(await blob.slice(tailStart).arrayBuffer());
  const joined = new Uint8Array(head.length + tail.length);
  joined.set(head, 0);
  joined.set(tail, head.length);
  return `v1:${blob.size}:${await sha256Hex(joined)}`;
}

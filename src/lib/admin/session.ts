// Signed session cookie using only Web Crypto, so the same code runs in the Edge
// middleware and in Node route handlers. The token is `<payload>.<signature>`,
// both base64url, signed with HMAC-SHA-256.

export const SESSION_COOKIE = 'sw_admin';
export const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60;
const MIN_SECRET_LENGTH = 32;
const CLOCK_SKEW_SECONDS = 60;

export type SessionPayload = { v: 1; iat: number; exp: number; sid: string };

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  try {
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function importKey(secret: string, usage: 'sign' | 'verify') {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

export async function createSessionToken(secret: string, nowMs = Date.now(), ttlSeconds = SESSION_TTL_SECONDS): Promise<string> {
  if (secret.length < MIN_SECRET_LENGTH) throw new Error(`SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`);
  const iat = Math.floor(nowMs / 1000);
  const payload: SessionPayload = { v: 1, iat, exp: iat + ttlSeconds, sid: toBase64Url(crypto.getRandomValues(new Uint8Array(12))) };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await importKey(secret, 'sign'), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | null | undefined, secret: string, nowMs = Date.now()): Promise<SessionPayload | null> {
  if (!token || secret.length < MIN_SECRET_LENGTH) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const signature = fromBase64Url(parts[1]);
  if (!signature) return null;
  // subtle.verify compares in constant time.
  const valid = await crypto.subtle.verify('HMAC', await importKey(secret, 'verify'), signature, encoder.encode(parts[0]));
  if (!valid) return null;
  const bytes = fromBase64Url(parts[0]);
  if (!bytes) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as SessionPayload;
    const now = Math.floor(nowMs / 1000);
    if (payload.v !== 1 || typeof payload.exp !== 'number' || typeof payload.iat !== 'number') return null;
    if (payload.exp <= now || payload.iat > now + CLOCK_SKEW_SECONDS) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return undefined;
}

export function sessionCookieOptions(isProduction: boolean) {
  return { httpOnly: true, secure: isProduction, sameSite: 'lax' as const, path: '/', maxAge: SESSION_TTL_SECONDS };
}

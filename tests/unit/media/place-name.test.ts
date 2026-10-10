import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNominatimGeocoder, formatPlaceName } from '@/lib/media/place-name';

test('prefers the most specific local name and appends the city', () => {
  assert.equal(formatPlaceName({ quarter: 'Torrey Pines Terrace', suburb: 'Del Mar Heights', city: 'San Diego', country_code: 'us' }), 'Torrey Pines Terrace, San Diego');
  assert.equal(formatPlaceName({ leisure: 'Torrey Pines State Natural Reserve', suburb: 'La Jolla', city: 'San Diego', country_code: 'us' }), 'Torrey Pines State Natural Reserve, San Diego');
  assert.equal(formatPlaceName({ suburb: 'Pacific Beach', city: 'San Diego', country_code: 'us' }), 'Pacific Beach, San Diego');
});

test('adds the country outside the United States', () => {
  assert.equal(
    formatPlaceName({ tourism: 'Fushimi Inari-taisha', suburb: 'Fushimi Ward', city: 'Kyoto', country: 'Japan', country_code: 'jp' }),
    'Fushimi Inari-taisha, Kyoto, Japan'
  );
});

test('falls back to the town, village or county when there is no city', () => {
  assert.equal(formatPlaceName({ hamlet: 'Glen Arbor', town: 'Empire', country_code: 'us' }), 'Glen Arbor, Empire');
  // A village is already a good area name, so the municipality above it is left out.
  assert.equal(formatPlaceName({ village: 'Cadzand', municipality: 'Sluis', country: 'Netherlands', country_code: 'nl' }), 'Cadzand, Netherlands');
  assert.equal(formatPlaceName({ county: 'Mackinac County', country_code: 'us' }), 'Mackinac County');
});

test('does not repeat a name that appears as both the local and the area name', () => {
  assert.equal(formatPlaceName({ suburb: 'Nashville', city: 'Nashville', country_code: 'us' }), 'Nashville');
  assert.equal(formatPlaceName({ city: 'Nashville', country_code: 'us' }), 'Nashville');
});

test('shows only the country when nothing more specific is known outside the US', () => {
  assert.equal(formatPlaceName({ country: 'Iceland', country_code: 'is' }), 'Iceland');
});

test('returns null for missing or empty addresses', () => {
  assert.equal(formatPlaceName(undefined), null);
  assert.equal(formatPlaceName({}), null);
  assert.equal(formatPlaceName({ country_code: 'us' }), null);
});

// --- the throttled Nominatim client ---------------------------------------------------

type Call = { url: string; at: number; headers: Record<string, string> };

function harness(respond: (url: string) => { ok?: boolean; json?: unknown } | Error = () => ({ json: { address: { suburb: 'Pacific Beach', city: 'San Diego', country_code: 'us' } } })) {
  let clock = 0;
  const calls: Call[] = [];
  const geocoder = createNominatimGeocoder({
    userAgent: 'test-agent (https://example.com)',
    minIntervalMs: 1100,
    now: () => clock,
    sleep: async (ms) => { clock += ms; },
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, at: clock, headers: Object.fromEntries(new Headers(init?.headers).entries()) });
      const result = respond(url);
      if (result instanceof Error) throw result;
      return { ok: result.ok ?? true, status: result.ok === false ? 429 : 200, json: async () => result.json } as Response;
    }) as typeof fetch,
  });
  return { geocoder, calls, advance: (ms: number) => { clock += ms; } };
}

test('sends an identifying User-Agent and asks for English addresses at street-block zoom', async () => {
  const { geocoder, calls } = harness();
  assert.equal(await geocoder.reverse(32.9333, -117.26), 'Pacific Beach, San Diego');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers['user-agent'], 'test-agent (https://example.com)');
  const url = new URL(calls[0].url);
  assert.equal(url.origin + url.pathname, 'https://nominatim.openstreetmap.org/reverse');
  assert.equal(url.searchParams.get('lat'), '32.9333');
  assert.equal(url.searchParams.get('lon'), '-117.26');
  assert.equal(url.searchParams.get('format'), 'jsonv2');
  assert.equal(url.searchParams.get('addressdetails'), '1');
  assert.equal(url.searchParams.get('zoom'), '16');
  assert.equal(url.searchParams.get('accept-language'), 'en');
});

test('never sends two requests closer together than the minimum interval, even when called at once', async () => {
  const { geocoder, calls } = harness();
  await Promise.all([geocoder.reverse(1, 1), geocoder.reverse(2, 2), geocoder.reverse(3, 3)]);
  assert.equal(calls.length, 3);
  assert.ok(calls[1].at - calls[0].at >= 1100, `gap 1 was ${calls[1].at - calls[0].at}`);
  assert.ok(calls[2].at - calls[1].at >= 1100, `gap 2 was ${calls[2].at - calls[1].at}`);
});

test('does not wait when enough time has already passed', async () => {
  const { geocoder, calls, advance } = harness();
  await geocoder.reverse(1, 1);
  advance(5000);
  await geocoder.reverse(2, 2);
  assert.equal(calls[1].at - calls[0].at, 5000);
});

test('returns null (and keeps working) when the service errors, rate-limits or returns nothing useful', async () => {
  const seq = [new Error('network down'), { ok: false }, { json: { error: 'Unable to geocode' } }, { json: { address: {} } }, { json: { address: { city: 'Kyoto', country: 'Japan', country_code: 'jp' } } }] as const;
  let i = 0;
  const { geocoder } = harness(() => seq[i++] as never);
  assert.equal(await geocoder.reverse(1, 1), null);
  assert.equal(await geocoder.reverse(1, 1), null);
  assert.equal(await geocoder.reverse(1, 1), null);
  assert.equal(await geocoder.reverse(1, 1), null);
  assert.equal(await geocoder.reverse(1, 1), 'Kyoto, Japan');
});

test('refuses impossible coordinates without calling the service', async () => {
  const { geocoder, calls } = harness();
  assert.equal(await geocoder.reverse(91, 0), null);
  assert.equal(await geocoder.reverse(0, 181), null);
  assert.equal(await geocoder.reverse(Number.NaN, 0), null);
  assert.equal(calls.length, 0);
});

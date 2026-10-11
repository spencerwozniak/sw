// Turn GPS coordinates into a short public place name such as "Torrey Pines Terrace,
// San Diego". Only the name is ever stored; the coordinates stay in the private original.
// OpenStreetMap's Nominatim policy: at most one request per second, an identifying
// User-Agent, results cached (we store them), and visible attribution.

export type Geocoder = { reverse(latitude: number, longitude: number): Promise<string | null> };

type Address = Record<string, string | undefined>;

// Most specific first.
const LOCAL_KEYS = ['tourism', 'leisure', 'natural', 'historic', 'amenity', 'neighbourhood', 'quarter', 'suburb', 'hamlet'];
const AREA_KEYS = ['city', 'town', 'village', 'municipality', 'county'];

const first = (address: Address, keys: string[], skip?: string) => keys.map((k) => address[k]).find((v) => v && v !== skip);

export function formatPlaceName(address: Address | undefined): string | null {
  if (!address) return null;
  const area = first(address, AREA_KEYS);
  const local = first(address, LOCAL_KEYS, area);
  const parts = [local, area].filter((v): v is string => !!v);
  if (address.country && address.country_code !== 'us') parts.push(address.country);
  return parts.length ? parts.join(', ') : null;
}

export type NominatimOptions = {
  userAgent: string;
  fetchImpl?: typeof fetch;
  minIntervalMs?: number;
  baseUrl?: string;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

export function createNominatimGeocoder(options: NominatimOptions): Geocoder {
  const {
    userAgent, fetchImpl = fetch, minIntervalMs = 1100, baseUrl = 'https://nominatim.openstreetmap.org',
    now = Date.now, sleep = (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  } = options;

  // Requests run strictly one after another, with a gap, however many callers there are.
  let queue: Promise<unknown> = Promise.resolve();
  let lastStart = Number.NEGATIVE_INFINITY;

  async function lookup(latitude: number, longitude: number): Promise<string | null> {
    const wait = lastStart + minIntervalMs - now();
    if (wait > 0) await sleep(wait);
    lastStart = now();
    try {
      const url = new URL('/reverse', baseUrl);
      url.search = new URLSearchParams({
        format: 'jsonv2', lat: String(latitude), lon: String(longitude), zoom: '16', addressdetails: '1', 'accept-language': 'en',
      }).toString();
      const response = await fetchImpl(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' } });
      if (!response.ok) return null;
      const body = (await response.json()) as { address?: Address; error?: string };
      return body.error ? null : formatPlaceName(body.address);
    } catch {
      return null; // A place name is a nicety: never fail an upload because of it.
    }
  }

  return {
    reverse(latitude, longitude) {
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        return Promise.resolve(null);
      }
      const result = queue.then(() => lookup(latitude, longitude));
      queue = result.catch(() => undefined);
      return result;
    },
  };
}

import { createNominatimGeocoder, type Geocoder } from './place-name';

let instance: Geocoder | undefined;

/** One shared geocoder per server instance, so the one-request-per-second spacing holds. */
export function getGeocoder(): Geocoder {
  instance ??= createNominatimGeocoder({
    userAgent: process.env.NOMINATIM_USER_AGENT || 'spencerwozniak.com photo admin (https://www.spencerwozniak.com)',
  });
  return instance;
}

import sharp from 'sharp';

// Small generated photos, so tests need no binary files in the repo.

export type FixtureOptions = {
  width?: number;
  height?: number;
  make?: string;
  model?: string;
  takenAt?: string; // EXIF format: 2024:11:30 12:26:00
  gps?: { latitudeRef: 'N' | 'S'; latitude: string; longitudeRef: 'E' | 'W'; longitude: string };
  orientation?: number;
};

/** A solid-colour JPEG, optionally carrying camera, date, GPS and orientation metadata. */
export async function jpegFixture(options: FixtureOptions = {}): Promise<Buffer> {
  const { width = 40, height = 20 } = options;
  let image = sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } }).jpeg();
  const exif: Record<string, Record<string, string>> = {};
  if (options.make || options.model) exif.IFD0 = { ...(options.make ? { Make: options.make } : {}), ...(options.model ? { Model: options.model } : {}) };
  if (options.takenAt) exif.IFD2 = { DateTimeOriginal: options.takenAt };
  if (options.gps) {
    exif.IFD3 = {
      GPSLatitudeRef: options.gps.latitudeRef, GPSLatitude: options.gps.latitude,
      GPSLongitudeRef: options.gps.longitudeRef, GPSLongitude: options.gps.longitude,
    };
  }
  if (Object.keys(exif).length) image = image.withExif(exif as never);
  if (options.orientation) image = image.withMetadata({ orientation: options.orientation });
  return image.toBuffer();
}

/** Torrey Pines State Beach, a public landmark (never a real photo location). */
export const TORREY_PINES_GPS = { latitudeRef: 'N', latitude: '32/1 56/1 0/1', longitudeRef: 'W', longitude: '117/1 15/1 36/1' } as const;

export async function pngWithAlphaFixture(): Promise<Buffer> {
  return sharp({ create: { width: 30, height: 30, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
}

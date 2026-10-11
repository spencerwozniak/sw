import exifr from 'exifr';

export type PhotoMetadata = {
  /** Local capture time, stored as if it were UTC so it never shifts with a timezone. */
  takenAt: Date | null;
  camera: string | null;
  gps: { latitude: number; longitude: number } | null;
};

const EMPTY: PhotoMetadata = { takenAt: null, camera: null, gps: null };

/** "2024:11:30 12:26:00" -> a Date holding that wall-clock time as UTC, or null when it is not a real date. */
function wallClockDate(value: unknown): Date | null {
  const m = typeof value === 'string' ? value.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/) : null;
  if (!m) return null;
  const date = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
  return Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1990 ? null : date;
}

/** Reads what the original photo knows about itself. Never throws: missing or broken metadata gives nulls. */
export async function readPhotoMetadata(buffer: Buffer): Promise<PhotoMetadata> {
  if (buffer.length === 0) return EMPTY;
  try {
    const tags = (await exifr.parse(buffer, { pick: ['DateTimeOriginal', 'CreateDate', 'Make', 'Model'], reviveValues: false })) as
      | Record<string, unknown>
      | undefined;
    const gps = await exifr.gps(buffer).catch(() => undefined);
    const model = typeof tags?.Model === 'string' ? tags.Model.trim() : '';
    const make = typeof tags?.Make === 'string' ? tags.Make.trim() : '';
    const validGps =
      gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude) && Math.abs(gps.latitude) <= 90 && Math.abs(gps.longitude) <= 180
        ? { latitude: gps.latitude, longitude: gps.longitude }
        : null;
    return {
      takenAt: wallClockDate(tags?.DateTimeOriginal) ?? wallClockDate(tags?.CreateDate),
      camera: model || make || null,
      gps: validGps,
    };
  } catch {
    return EMPTY;
  }
}

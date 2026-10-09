// Usage: npm run photos -- <source-dir>
//
// For each image in <source-dir>: auto-orient, resize to fit within 2400px,
// re-encode as JPEG with ALL metadata (EXIF, GPS) stripped, and write
// public/images/photos/<id>.jpg. New entries are appended to
// src/data/photos.json; ids already there are skipped, so hand-edited
// captions survive a re-run.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import exifr from 'exifr';
import { idFromFilename, captionFromId, exifDateToIso, mergePhotos, type Photo } from '../src/lib/photos-core';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'public', 'images', 'photos');
const DATA_FILE = path.join(ROOT, 'src', 'data', 'photos.json');
// Captions from the old /gallery page; only present for the first import.
const LEGACY_CAPTIONS = path.join(ROOT, 'src', 'data', 'gallery.json');
const MAX_EDGE = 2400;
const IMAGE_EXT = /\.(jpe?g|png|webp|tiff?)$/i;

type LegacyTab = { images: { url: string; caption?: string }[] };

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw err;
  }
}

async function legacyCaptions(): Promise<Map<string, string>> {
  const tabs = await readJson<LegacyTab[]>(LEGACY_CAPTIONS, []);
  const captions = new Map<string, string>();
  for (const tab of tabs) {
    for (const image of tab.images) {
      if (image.caption) captions.set(idFromFilename(path.basename(image.url)), image.caption);
    }
  }
  return captions;
}

async function main() {
  const srcDir = process.argv[2];
  if (!srcDir) {
    console.error('Usage: npm run photos -- <source-dir>');
    process.exit(1);
  }

  const existing = await readJson<Photo[]>(DATA_FILE, []);
  const known = new Set(existing.map((p) => p.id));
  const captions = await legacyCaptions();
  await fs.mkdir(OUT_DIR, { recursive: true });

  const files = (await fs.readdir(srcDir)).filter((f) => IMAGE_EXT.test(f)).sort();
  const incoming: Photo[] = [];

  for (const name of files) {
    const id = idFromFilename(name);
    if (known.has(id)) {
      console.log(`skip  ${id} (already in photos.json)`);
      continue;
    }
    const input = path.join(srcDir, name);
    const exif: { DateTimeOriginal?: string; Model?: string } | undefined = await exifr
      .parse(input, { pick: ['DateTimeOriginal', 'Model'], reviveValues: false })
      .catch(() => undefined);
    const file = `${id}.jpg`;
    // sharp drops all metadata unless asked to keep it; rotate() bakes in EXIF orientation first.
    const info = await sharp(input)
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(path.join(OUT_DIR, file));

    incoming.push({
      id,
      file,
      caption: captions.get(id) ?? captionFromId(id),
      width: info.width,
      height: info.height,
      takenAt: exifDateToIso(exif?.DateTimeOriginal),
      camera: exif?.Model?.trim() || null,
    });
    known.add(id);
    console.log(`add   ${id} ${info.width}x${info.height}`);
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(mergePhotos(existing, incoming), null, 2) + '\n');
  console.log(`${incoming.length} added, ${existing.length + incoming.length} total`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

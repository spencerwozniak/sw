import sharp from 'sharp';

export const WEB_COPY_MAX_EDGE = 2400;

/**
 * The public version of a photo: upright pixels, at most 2400px on the long edge,
 * JPEG, and with ALL metadata removed (no GPS, camera or date). sharp drops metadata
 * unless asked to keep it; rotate() first bakes the EXIF orientation into the pixels.
 */
export async function makeWebCopy(original: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(original)
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize({ width: WEB_COPY_MAX_EDGE, height: WEB_COPY_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

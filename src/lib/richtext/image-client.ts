// Browser-side helpers for images in the editor. Browser only (canvas, fetch).

const MAX_EDGE = 2000;

/**
 * Shrinks a photo before it is sent (a phone photo can be 10 MB; the server accepts 4 MB). Applies the
 * camera's orientation and flattens transparency onto white. Anything the browser cannot decode (such as
 * HEIC on desktop) is sent as it is, so the server can explain what is wrong.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

export type UploadedImage = { id: string; url: string; width: number; height: number };

export async function uploadArticleImage(file: File): Promise<UploadedImage> {
  const form = new FormData();
  form.append('file', await shrinkImage(file));
  const response = await fetch('/api/admin/assets', { method: 'POST', body: form });
  const data = (await response.json().catch(() => ({}))) as Partial<UploadedImage> & { error?: string };
  if (!response.ok || !data.url) throw new Error(data.error || 'Could not upload the image.');
  return data as UploadedImage;
}

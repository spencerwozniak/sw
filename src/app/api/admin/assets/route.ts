import { requireAdminApi } from '@/lib/admin/auth';
import { articleAssetDeps } from '@/lib/articles/asset-services';
import { InvalidAssetError, processArticleImage } from '@/lib/articles/assets';

// The editor sends a (client-shrunk) image in the request itself. It is re-encoded here with all
// metadata removed and saved to the public store, so a photo's GPS can never end up in an article.
export const maxDuration = 30;

export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Send the image as form data.' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File)) return Response.json({ error: 'No image was sent.' }, { status: 400 });

  try {
    const asset = await processArticleImage({ name: file.name, type: file.type, bytes: Buffer.from(await file.arrayBuffer()) }, articleAssetDeps);
    return Response.json(asset, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidAssetError) return Response.json({ error: error.message }, { status: 400 });
    console.error('Image upload failed:', error);
    return Response.json({ error: 'Could not save the image.' }, { status: 500 });
  }
}

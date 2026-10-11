'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin/auth';
import { ARTICLES_TAG } from '@/lib/cache-tags';
import { renderBody } from '@/lib/articles/body';
import { InvalidArticleError, parseArticleFields, publishProblems } from '@/lib/articles/input';
import { ArticleNotFoundError, SlugTakenError, createArticle, deleteArticle, getArticle, saveArticle, setArticleStatus } from '@/lib/articles/repo';
import { slugify } from '@/lib/articles/slug';
import { toDateInput } from '@/lib/articles/dates';
import { InvalidRichTextError } from '@/lib/richtext/parse-state';
import { emptyState, lexicalPlainText, type LexState } from '@/lib/richtext/state';

// Every action starts by checking the admin session (tests/unit/admin-actions-guarded.test.ts enforces
// it) and returns { ok: false, error } instead of throwing, because Next hides the message of a thrown
// error in production.

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const ID = /^[a-z0-9]{20,40}$/;

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof InvalidArticleError || error instanceof InvalidRichTextError || error instanceof SlugTakenError || error instanceof ArticleNotFoundError) {
    return { ok: false, error: error.message };
  }
  console.error('Article action failed:', error);
  return { ok: false, error: 'Something went wrong. Try again.' };
}

/** Make a change visible on the public site now, not at the next deploy. */
function revalidatePublic(slug: string | null) {
  revalidateTag(ARTICLES_TAG);
  revalidatePath('/writing');
  revalidatePath('/');
  if (slug) revalidatePath(`/writing/${slug}`);
  revalidatePath('/admin/articles');
}

export async function createArticleAction(input: { kind: unknown; title: unknown; externalUrl?: unknown }): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  try {
    const empty = renderBody(emptyState());
    const base = typeof input.title === 'string' ? slugify(input.title) : 'untitled';
    for (let attempt = 1; attempt <= 20; attempt++) {
      try {
        const fields = parseArticleFields({
          kind: input.kind,
          slug: input.kind === 'ARTICLE' ? (attempt === 1 ? base : `${base}-${attempt}`) : undefined,
          externalUrl: input.externalUrl,
          title: input.title,
          topic: '',
          author: '',
          publishedOn: toDateInput(new Date()),
          keywords: [],
        });
        const article = await createArticle(fields, { json: empty.state, html: empty.html });
        revalidatePath('/admin/articles');
        return { ok: true, id: article.id };
      } catch (error) {
        if (!(error instanceof SlugTakenError) || input.kind !== 'ARTICLE') throw error;
      }
    }
    return { ok: false, error: 'Could not find a free URL name. Choose a different title.' };
  } catch (error) {
    return failure(error);
  }
}

/** Saves the details and the body. The browser sends editor state, never HTML. */
export async function saveArticleAction(id: unknown, payload: { fields: Record<string, unknown>; body: unknown }): Promise<ActionResult<{ savedAt: string }>> {
  await requireAdmin();
  try {
    if (typeof id !== 'string' || !ID.test(id)) throw new InvalidArticleError('Unknown article.');
    const fields = parseArticleFields(payload.fields);
    const body = renderBody(payload.body);
    const article = await saveArticle(id, { fields, body: { json: body.state, html: body.html } });
    if (article.status === 'PUBLISHED') revalidatePublic(article.slug);
    else revalidatePath('/admin/articles');
    return { ok: true, savedAt: article.updatedAt.toISOString() };
  } catch (error) {
    return failure(error);
  }
}

export async function setArticleStatusAction(id: unknown, published: boolean): Promise<ActionResult> {
  await requireAdmin();
  try {
    if (typeof id !== 'string' || !ID.test(id)) throw new InvalidArticleError('Unknown article.');
    const article = await getArticle(id);
    if (!article) throw new ArticleNotFoundError('That article no longer exists.');
    if (published) {
      const problems = publishProblems(article, lexicalPlainText(article.bodyJson as unknown as LexState));
      if (problems.length) return { ok: false, error: `Before publishing: ${problems.join(' ')}` };
    }
    await setArticleStatus(id, published ? 'PUBLISHED' : 'DRAFT');
    revalidatePublic(article.slug);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteArticleAction(id: unknown): Promise<ActionResult> {
  await requireAdmin();
  try {
    if (typeof id !== 'string' || !ID.test(id)) throw new InvalidArticleError('Unknown article.');
    const article = await getArticle(id);
    await deleteArticle(id);
    revalidatePublic(article?.slug ?? null);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

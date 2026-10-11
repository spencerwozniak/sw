import { Prisma, type Article } from '@/generated/prisma/client';
import { getDb } from '@/lib/db';
import type { LexState } from '@/lib/richtext/state';
import type { ArticleFields } from './input';

// The only place the admin and the public site read and write Article rows.

export class SlugTakenError extends Error {}
export class ArticleNotFoundError extends Error {}

export type StoredBody = { json: LexState; html: string };
export const ARTICLES_PAGE_SIZE = 30;

function isSlugConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export type NewArticleExtras = { status?: 'DRAFT' | 'PUBLISHED'; publishedAt?: Date | null; createdAt?: Date; legacyHtml?: string | null };

export async function createArticle(fields: ArticleFields, body: StoredBody, extras: NewArticleExtras = {}): Promise<Article> {
  try {
    return await getDb().article.create({
      data: { ...fields, bodyJson: body.json as unknown as Prisma.InputJsonValue, bodyHtml: body.html, ...extras },
    });
  } catch (error) {
    if (isSlugConflict(error)) throw new SlugTakenError('That URL name is already used by another article.');
    throw error;
  }
}

/** Updates the details and/or the body. The type (article or publication) never changes. */
export async function saveArticle(id: string, update: { fields?: ArticleFields; body?: StoredBody }): Promise<Article> {
  const db = getDb();
  const existing = await db.article.findUnique({ where: { id }, select: { kind: true } });
  if (!existing) throw new ArticleNotFoundError('That article no longer exists.');
  if (update.fields && update.fields.kind !== existing.kind) throw new SlugTakenError('The type of an item cannot be changed.');
  try {
    return await db.article.update({
      where: { id },
      data: {
        ...(update.fields ?? {}),
        ...(update.body ? { bodyJson: update.body.json as unknown as Prisma.InputJsonValue, bodyHtml: update.body.html } : {}),
      },
    });
  } catch (error) {
    if (isSlugConflict(error)) throw new SlugTakenError('That URL name is already used by another article.');
    throw error;
  }
}

/** Publishing records the first publish time; going back to draft keeps it. */
export async function setArticleStatus(id: string, status: 'DRAFT' | 'PUBLISHED'): Promise<Article> {
  const db = getDb();
  const existing = await db.article.findUnique({ where: { id }, select: { publishedAt: true } });
  if (!existing) throw new ArticleNotFoundError('That article no longer exists.');
  return db.article.update({ where: { id }, data: { status, ...(status === 'PUBLISHED' && !existing.publishedAt ? { publishedAt: new Date() } : {}) } });
}

export const getArticle = (id: string) => getDb().article.findUnique({ where: { id } });
export const deleteArticle = async (id: string): Promise<void> => void (await getDb().article.deleteMany({ where: { id } }));

export type ArticleFilters = { kind?: 'ARTICLE' | 'PUBLICATION'; status?: 'DRAFT' | 'PUBLISHED'; q?: string; page: number };

export async function listArticles(filters: ArticleFilters) {
  const db = getDb();
  const contains = filters.q ? { contains: filters.q, mode: 'insensitive' as const } : undefined;
  const where: Prisma.ArticleWhereInput = {
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(contains ? { OR: [{ title: contains }, { topic: contains }, { slug: contains }] } : {}),
  };
  const [items, total] = await Promise.all([
    // Drafts first (DRAFT is declared before PUBLISHED), then the most recently edited.
    db.article.findMany({ where, orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }], skip: (filters.page - 1) * ARTICLES_PAGE_SIZE, take: ARTICLES_PAGE_SIZE }),
    db.article.count({ where }),
  ]);
  return { items, total, pageCount: Math.max(1, Math.ceil(total / ARTICLES_PAGE_SIZE)) };
}

/** Newest first by their displayed date; articles with the same date keep the order they were added in. */
export const publishedOrder: Prisma.ArticleOrderByWithRelationInput[] = [{ publishedOn: 'desc' }, { createdAt: 'desc' }];

export const loadPublished = (kind: 'ARTICLE' | 'PUBLICATION') =>
  getDb().article.findMany({ where: { kind, status: 'PUBLISHED' }, orderBy: publishedOrder });

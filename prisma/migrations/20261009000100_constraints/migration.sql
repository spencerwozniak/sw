-- Postgres treats NULLs as distinct, so @@unique([parentId, slug]) alone would allow two
-- root collections (parentId IS NULL) to share a slug. This partial index closes that gap.
CREATE UNIQUE INDEX "Collection_root_slug_key" ON "Collection"("slug") WHERE "parentId" IS NULL;

-- Every article needs a slug for its /writing/<slug> URL. Publications link out to a DOI
-- instead of having a page, so they may omit it.
ALTER TABLE "Article" ADD CONSTRAINT "Article_slug_required_for_articles" CHECK ("kind" <> 'ARTICLE' OR "slug" IS NOT NULL);

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('PHOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ProcessingState" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('TEXT', 'GRID');

-- CreateEnum
CREATE TYPE "ArticleKind" AS ENUM ('ARTICLE', 'PUBLICATION');

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "processing" "ProcessingState" NOT NULL DEFAULT 'PENDING',
    "processingError" TEXT,
    "caption" TEXT NOT NULL DEFAULT '',
    "altText" TEXT NOT NULL DEFAULT '',
    "placeName" TEXT,
    "takenAt" TIMESTAMP(3),
    "camera" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationSec" DOUBLE PRECISION,
    "bytes" INTEGER,
    "mimeType" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "originalPath" TEXT,
    "webUrl" TEXT,
    "posterUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "coverId" TEXT,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "position" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionSlugHistory" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,

    CONSTRAINT "CollectionSlugHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionBlock" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "BlockType" NOT NULL,
    "bodyJson" JSONB,
    "bodyHtml" TEXT,

    CONSTRAINT "CollectionBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionBlockMedia" (
    "blockId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "CollectionBlockMedia_pkey" PRIMARY KEY ("blockId","mediaId")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "kind" "ArticleKind" NOT NULL,
    "slug" TEXT,
    "externalUrl" TEXT,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "publishedOn" DATE NOT NULL,
    "keywords" TEXT[],
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "bodyJson" JSONB NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "legacyHtml" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Media_contentHash_key" ON "Media"("contentHash");

-- CreateIndex
CREATE INDEX "Media_status_takenAt_idx" ON "Media"("status", "takenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_parentId_slug_key" ON "Collection"("parentId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionSlugHistory_path_key" ON "CollectionSlugHistory"("path");

-- CreateIndex
CREATE INDEX "CollectionBlock_collectionId_position_idx" ON "CollectionBlock"("collectionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_kind_status_publishedOn_idx" ON "Article"("kind", "status", "publishedOn");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipHash_at_idx" ON "LoginAttempt"("ipHash", "at");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionSlugHistory" ADD CONSTRAINT "CollectionSlugHistory_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionBlock" ADD CONSTRAINT "CollectionBlock_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionBlockMedia" ADD CONSTRAINT "CollectionBlockMedia_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "CollectionBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionBlockMedia" ADD CONSTRAINT "CollectionBlockMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

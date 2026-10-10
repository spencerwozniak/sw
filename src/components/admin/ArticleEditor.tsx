'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Breadcrumb, Button, ConfirmDialog, Field, Input, StatusTag, useToast } from '@/components/ui';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { createAutosave, type AutosaveStatus } from '@/lib/richtext/autosave';
import { slugify } from '@/lib/articles/slug';
import type { LexState } from '@/lib/richtext/state';
import { deleteArticleAction, saveArticleAction, setArticleStatusAction } from '@/app/admin/(authed)/articles/actions';

export type EditableArticle = {
  id: string;
  kind: 'ARTICLE' | 'PUBLICATION';
  slug: string | null;
  externalUrl: string | null;
  title: string;
  topic: string;
  author: string;
  /** YYYY-MM-DD */
  publishedOn: string;
  keywords: string[];
  status: 'DRAFT' | 'PUBLISHED';
  body: LexState;
};

type Payload = { fields: Record<string, unknown>; body: LexState };

const STATUS_TEXT: Record<AutosaveStatus, string> = { idle: '', dirty: 'Unsaved changes', saving: 'Saving…', saved: 'Saved', error: 'Not saved' };

export function ArticleEditor({ article }: { article: EditableArticle }) {
  const router = useRouter();
  const toast = useToast();
  const isArticle = article.kind === 'ARTICLE';

  const [title, setTitle] = useState(article.title);
  const [slug, setSlug] = useState(article.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isArticle && article.slug !== slugify(article.title));
  const [topic, setTopic] = useState(article.topic);
  const [author, setAuthor] = useState(article.author);
  const [publishedOn, setPublishedOn] = useState(article.publishedOn);
  const [keywords, setKeywords] = useState(article.keywords.join(', '));
  const [externalUrl, setExternalUrl] = useState(article.externalUrl ?? '');
  const [status, setStatus] = useState(article.status);
  const [saveStatus, setSaveStatus] = useState<AutosaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const body = useRef<LexState>(article.body);
  const live = status === 'PUBLISHED';

  const payload = useCallback(
    (): Payload => ({
      fields: {
        kind: article.kind, slug: isArticle ? slug : undefined, externalUrl: isArticle ? undefined : externalUrl, title, topic, author, publishedOn,
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      },
      body: body.current,
    }),
    [article.kind, isArticle, slug, externalUrl, title, topic, author, publishedOn, keywords]
  );
  const latest = useRef(payload);
  latest.current = payload;

  const autosave = useMemo(
    () =>
      createAutosave<Payload>({
        save: (p) => saveArticleAction(article.id, p),
        onStatus: (next, error) => {
          setSaveStatus(next);
          setSaveError(next === 'error' ? error ?? 'Could not save.' : null);
        },
      }),
    [article.id]
  );

  // A published article is live: partial edits must not go out by themselves, so only drafts autosave.
  // Edits to a live article wait for "Save changes".
  const changed = useCallback(() => {
    if (live) {
      setSaveStatus('dirty');
      return;
    }
    autosave.schedule(latest.current());
  }, [autosave, live]);

  // Fields changed by typing; the body is reported by the editor through onBody.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    changed();
  }, [title, slug, topic, author, publishedOn, keywords, externalUrl, changed]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'dirty' || saveStatus === 'saving' || saveStatus === 'error') e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveStatus]);

  const saveNow = async () => {
    setBusy(true);
    autosave.cancel();
    const result = await saveArticleAction(article.id, latest.current());
    setBusy(false);
    if (!result.ok) {
      setSaveStatus('error');
      setSaveError(result.error);
      toast(result.error, { tone: 'error' });
      return false;
    }
    setSaveStatus('saved');
    setSaveError(null);
    return true;
  };

  const togglePublished = async () => {
    if (!(await saveNow())) return;
    setBusy(true);
    const result = await setArticleStatusAction(article.id, !live);
    setBusy(false);
    if (!result.ok) return toast(result.error, { tone: 'error' });
    setStatus(live ? 'DRAFT' : 'PUBLISHED');
    toast(live ? 'Moved back to drafts' : 'Published');
    router.refresh();
  };

  const remove = async () => {
    setConfirmDelete(false);
    setBusy(true);
    const result = await deleteArticleAction(article.id);
    if (!result.ok) {
      setBusy(false);
      return toast(result.error, { tone: 'error' });
    }
    router.push('/admin/articles');
  };

  return (
    <div className="grid gap-6">
      <div className="pt-8">
        <Breadcrumb items={[{ label: 'Articles', href: '/admin/articles' }, { label: title || 'Untitled' }]} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusTag status={status} />
          <span role="status" className={saveStatus === 'error' ? 'font-sans text-[0.875rem] font-bold text-fg' : 'font-sans text-[0.875rem] text-muted'}>
            {saveStatus === 'error' ? saveError : STATUS_TEXT[saveStatus]}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {live && isArticle && article.slug && (
            <Button variant="outline" href={`/writing/${article.slug}`} newTab>
              View on site
            </Button>
          )}
          {live && (
            <Button variant="outline" onClick={saveNow} disabled={busy || saveStatus === 'saved' || saveStatus === 'idle'}>
              Save changes
            </Button>
          )}
          <Button variant="primary" onClick={togglePublished} disabled={busy}>
            {live ? 'Unpublish' : 'Publish'}
          </Button>
          <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={busy}>
            Delete
          </Button>
        </div>
      </div>

      <Field label="Title" htmlFor="article-title">
        <Input
          id="article-title"
          label="Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (isArticle && !slugTouched && !live) setSlug(slugify(e.target.value));
          }}
          className="h-14 font-serif text-[1.5rem] font-semibold"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        {isArticle ? (
          <Field label="URL name" htmlFor="article-slug" hint={live ? 'Changing this breaks links to the live article.' : `Appears as /writing/${slug || '…'}`}>
            <Input id="article-slug" label="URL name" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} />
          </Field>
        ) : (
          <Field label="DOI link" htmlFor="article-doi" hint="For example https://doi.org/10.1021/acs.jctc.4c01682">
            <Input id="article-doi" label="DOI link" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
          </Field>
        )}
        <Field label={isArticle ? 'Topic' : 'Journal'} htmlFor="article-topic">
          <Input id="article-topic" label={isArticle ? 'Topic' : 'Journal'} value={topic} onChange={(e) => setTopic(e.target.value)} />
        </Field>
        <Field label="Author" htmlFor="article-author">
          <Input id="article-author" label="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </Field>
        <Field label="Date" htmlFor="article-date">
          <Input id="article-date" label="Date" type="date" value={publishedOn} onChange={(e) => setPublishedOn(e.target.value)} />
        </Field>
        <Field label="Keywords" htmlFor="article-keywords" hint="Separated by commas. Used for search engines." className="sm:col-span-2">
          <Input id="article-keywords" label="Keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
        </Field>
      </div>

      <div>
        <p className="mb-2 font-sans text-[0.8125rem] text-muted">
          {isArticle ? 'Article text' : 'Abstract'}
          {live && ' (this is live: changes go out when you press Save changes)'}
        </p>
        <RichTextEditor
          key={article.id}
          label={isArticle ? 'Article text' : 'Abstract'}
          initialState={article.body}
          onChange={(state) => {
            body.current = state;
            changed();
          }}
        />
      </div>

      <p className="font-sans text-[0.8125rem] text-muted">
        Need to leave? <Link href="/admin/articles" className="link">Back to all articles</Link>. Drafts save by themselves.
      </p>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this article?"
        description={live ? 'It is live on the site right now. This cannot be undone.' : 'This cannot be undone.'}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </div>
  );
}

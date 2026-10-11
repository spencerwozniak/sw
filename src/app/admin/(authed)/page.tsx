import { Container, PageHeader, Panel, Stat } from '@/components/ui';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const db = getDb();
  const [photos, videos, drafts, collections, articles] = await Promise.all([
    db.media.count({ where: { kind: 'PHOTO' } }),
    db.media.count({ where: { kind: 'VIDEO' } }),
    db.media.count({ where: { status: 'DRAFT' } }),
    db.collection.count(),
    db.article.count(),
  ]);

  return (
    <Container as="main" width="wide">
      <PageHeader title="Admin" subtitle="Everything you publish on the site, in one place." />
      <Panel>
        <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-5">
          <Stat value={photos} label="Photos" />
          <Stat value={videos} label="Videos" />
          <Stat value={drafts} label="Drafts" />
          <Stat value={collections} label="Collections" />
          <Stat value={articles} label="Articles" />
        </dl>
      </Panel>
    </Container>
  );
}

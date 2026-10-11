import { MediaScreen } from '@/components/admin/MediaScreen';

export const dynamic = 'force-dynamic';

export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <MediaScreen scope="inbox" title="Inbox" subtitle="Uploads waiting to be published." searchParams={await searchParams} />;
}

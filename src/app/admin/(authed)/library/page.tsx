import { MediaScreen } from '@/components/admin/MediaScreen';

export const dynamic = 'force-dynamic';

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <MediaScreen scope="library" title="Library" subtitle="Every photo and video." searchParams={await searchParams} />;
}

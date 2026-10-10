import { Meta, Panel, Title } from '@/components/ui';
import { safeNext } from '@/lib/admin/redirect';
import { LoginForm } from './LoginForm';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-[26rem] place-items-center px-[var(--gutter)] py-12">
      <Panel className="w-full">
        <Meta as="p" className="mb-2">
          Admin
        </Meta>
        <Title as="h1" size="h2" className="mb-6">
          Sign in
        </Title>
        <LoginForm next={safeNext(next)} />
      </Panel>
    </main>
  );
}

import { AdminHeader } from '@/components/admin/AdminHeader';
import { ToastProvider } from '@/components/ui';
import { requireAdmin } from '@/lib/admin/auth';

export default async function AuthedAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <ToastProvider>
      <AdminHeader />
      <div className="pb-24">{children}</div>
    </ToastProvider>
  );
}

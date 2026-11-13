export const dynamic = 'force-dynamic';

import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { getAdminMetaAction, getAuthenticatedUser } from '@/features/dashboard/actions';

export default async function ListLayout({ children }: { children: React.ReactNode }) {
  // Fetch adminMeta and user data server-side to avoid loading states
  const [adminMetaResponse, userResponse] = await Promise.all([
    getAdminMetaAction(),
    getAuthenticatedUser()
  ]);
  
  const adminMeta = adminMetaResponse.success ? adminMetaResponse.data : null;
  const user = userResponse.success ? userResponse.data?.authenticatedItem : null;

  // The Agency row is unreadable for some roles; agencyName is the public agency name every role can read.
  let agencyName: string | null = userResponse.success ? userResponse.data?.agencies?.[0]?.name ?? null : null;
  if (!agencyName) {
    const r = await keystoneClient('{ agencyName }');
    agencyName = r.success ? ((r.data as any).agencyName as string) || null : null;
  }

  return (
    <DashboardLayout adminMeta={adminMeta} authenticatedItem={user} athletesCount={userResponse.success ? userResponse.data?.athletesCount : null} agencyName={agencyName}>
      {children}
    </DashboardLayout>
  );
}
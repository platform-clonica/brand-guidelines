import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth/sessionUser';
import { Rewriter } from '@/components/rewriter/Rewriter';

export const metadata: Metadata = {
  title: 'ReWritr',
  robots: { index: false, follow: false },
};

export default async function RewriterPage() {
  const user = await getSessionUser();
  return <Rewriter user={user} />;
}

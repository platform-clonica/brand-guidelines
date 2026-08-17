import type { Metadata } from 'next';
import { Rewriter } from '@/components/rewriter/Rewriter';

export const metadata: Metadata = {
  title: 'ReWritr',
  robots: { index: false, follow: false },
};

export default function RewriterPage() {
  return <Rewriter />;
}

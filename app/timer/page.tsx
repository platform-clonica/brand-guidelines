/* Timer (RSC). Standalone public tool at /timer — sibling of [locale]/, deck/ and forms/,
   so it inherits only the root layout (fonts + globals.css) and none of the brand chrome.
   Public but noindex, like every surface here that is not the brand guide itself
   (the X-Robots-Tag header is also set at the edge in middleware.ts). */

import type { Metadata } from 'next';
import { TimerClient } from '@/components/timer/TimerClient';
import '@/components/timer/timer.css';

export const metadata: Metadata = {
  title: 'Timer · Interactius',
  description: 'Cuenta atrás para talleres y sesiones.',
  robots: { index: false, follow: false },
};

export default function TimerPage() {
  return <TimerClient />;
}

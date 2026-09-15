/* DSMak_r — derivar secundario y acento desde el primario (U0 del prototipo).
   Lo usa el botón "Derivar del primario" del paso 1: rellena, no impone. */

import { clamp, hexToOklch, oklchToHex } from './color.ts';

export function deriveColors(primary: string): { secondary: string; accent: string } {
  const { L, C, h } = hexToOklch(primary);
  return {
    secondary: oklchToHex(clamp(L + 0.02, 0.2, 0.85), C * 0.95, h + 152),
    accent: oklchToHex(clamp(L + 0.06, 0.2, 0.88), Math.min(C * 1.25, 0.28), h - 42),
  };
}

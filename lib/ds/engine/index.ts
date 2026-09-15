/* DSMak_r — punto de entrada del motor. Quien necesite tokens llama a `composeTokens`, no a
   `generateTokens`: generar sin overrides es ignorar lo que el diseñador editó a mano. */

import type { Brand, Overrides, Tokens } from '../schema.ts';
import { generateTokens } from './generate.ts';
import { applyOverrides } from './overrides.ts';

export { ENGINE_VERSION } from './version.ts';

export function composeTokens(brand: Brand, overrides: Overrides): { tokens: Tokens; orphans: string[] } {
  return applyOverrides(generateTokens(brand), brand, overrides);
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { composeTokens, ENGINE_VERSION } from '../engine/index.ts';
import { defaultBrand } from '../engine/presets.ts';
import { interactiusTemplate } from '../template.ts';

/* Golden del motor (plan, H4). Si este test falla, la salida de composeTokens ha cambiado para unos
   mismos parámetros, y eso cambiaría en silencio los sistemas ya entregados. Dos salidas:
   - El cambio es un error: arréglalo.
   - El cambio es deliberado: sube ENGINE_VERSION en lib/ds/engine/version.ts y regenera los fixtures
     en el mismo commit con
       UPDATE_GOLDEN=1 node --test --experimental-strip-types lib/ds/__tests__/golden.test.ts */

const FIXTURES = join(import.meta.dirname, 'fixtures');

const CASES = [
  { file: 'engine-default.json', build: () => composeTokens(defaultBrand(), {}).tokens },
  {
    file: 'engine-interactius.json',
    build: () => {
      const { brand, overrides } = interactiusTemplate();
      return composeTokens(brand, overrides).tokens;
    },
  },
];

for (const { file, build } of CASES) {
  test(`golden del motor: ${file}`, () => {
    const path = join(FIXTURES, file);
    if (process.env.UPDATE_GOLDEN) {
      mkdirSync(FIXTURES, { recursive: true });
      writeFileSync(path, JSON.stringify({ engineVersion: ENGINE_VERSION, tokens: build() }, null, 2) + '\n');
    }
    assert.ok(existsSync(path), `Falta el fixture ${file}. Genéralo con UPDATE_GOLDEN=1 (ver la cabecera de este test).`);
    const fixture = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(fixture.engineVersion, ENGINE_VERSION, `ENGINE_VERSION ha cambiado: regenera ${file} con UPDATE_GOLDEN=1.`);
    assert.deepEqual(build(), fixture.tokens, 'La salida del motor ha cambiado sin subir ENGINE_VERSION.');
  });
}

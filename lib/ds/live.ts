/* DSMak_r — el sistema mientras se edita: tokens, incidencias y si se puede guardar.

   compileSystem abre filas guardadas y REPARA lo que no encaja. Mientras se edita no se repara nada
   (el valor sigue en el control), así que un valor fuera de esquema aquí es un error con su ruta,
   y los tokens se quedan en `null` para que el editor siga mostrando la última versión buena, como
   hacen DeckMak_r y FormMak_r con su visor.

   `blocking` es lo que el servidor rechazaría con un 400 (plan, bloque 3: "crear valida como el
   editor"). El autoguardado se pausa mientras dure, en vez de gastar reintentos. */

import { compileSystem, type DsIssue } from './compile.ts';
import { composeTokens, ENGINE_VERSION } from './engine/index.ts';
import { contrastWarnings, type ContrastWarning } from './engine/warnings.ts';
import { brandSchema, configsSchema, overridesSchema, type Brand, type Configs, type Overrides, type Tokens } from './schema.ts';

export type LiveSystem = {
  tokens: Tokens | null;
  issues: DsIssue[];
  contrast: ContrastWarning[];
  blocking: boolean;
};

const MODE_LABEL = { light: 'claro', dark: 'oscuro', both: 'de los dos modos' } as const;

function schemaIssues(root: string, result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }): DsIssue[] {
  if (result.success || !result.error) return [];
  const seen = new Set<string>();
  return result.error.issues.flatMap((iss) => {
    const path = [root, ...iss.path.map(String)].join('.');
    if (seen.has(path)) return [];
    seen.add(path);
    return [{ level: 'error' as const, path, message: 'Valor no válido.' }];
  });
}

function contrastIssue(w: ContrastWarning): DsIssue {
  const ratio = `${String(w.ratio).replace('.', ',')}:1`;
  if (w.kind === 'color-on-canvas') {
    return {
      level: 'warning',
      path: 'brand.colors.primary',
      message: `El primario ${w.color} sobre el fondo ${MODE_LABEL[w.mode]} da ${ratio}: no llega a AA (4,5:1) como texto o enlace.`,
    };
  }
  const step = w.path.split('.').pop();
  return {
    level: 'warning',
    path: `overrides.swatches.${w.path}`,
    message: `Ningún texto llega a AA sobre el primario ${step} (${ratio}): un botón con ese fondo no se leería bien.`,
  };
}

export function liveSystem({ brand, overrides, configs }: { brand: Brand; overrides: Overrides; configs: Configs }): LiveSystem {
  const invalid = [
    ...schemaIssues('brand', brandSchema.safeParse(brand)),
    ...schemaIssues('overrides', overridesSchema.safeParse(overrides)),
    ...schemaIssues('configs', configsSchema.safeParse(configs)),
  ];
  if (invalid.length) return { tokens: null, issues: invalid, contrast: [], blocking: true };

  const tokens = composeTokens(brand, overrides).tokens;
  const { issues } = compileSystem({ brand, overrides, configs, tokens, engine_version: ENGINE_VERSION });
  const contrast = contrastWarnings(tokens, brand);
  const all = [...issues, ...contrast.map(contrastIssue)];
  return { tokens, issues: all, contrast, blocking: all.some((i) => i.level === 'error') };
}

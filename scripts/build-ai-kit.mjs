/* Genera public/AI-Kit.zip — el paquete "para máquinas" del manual.
   Contenido: llms.txt + brand.json (desde el dev server, que sirve el SSOT
   de lib/tokens.ts) + assets vectoriales + README de uso.

   Uso: arrancar `npm run dev` y ejecutar `npm run build:ai-kit`.
   Regenerar SIEMPRE tras cambiar tokens, prompts o ejemplos. */

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.AI_KIT_SOURCE ?? 'http://localhost:3000';
const ROOT = path.resolve(import.meta.dirname, '..');
const STAGE = path.join(ROOT, '.ai-kit-stage', 'AI-Kit');
const OUT = path.join(ROOT, 'public', 'AI-Kit.zip');

const today = new Date().toISOString().slice(0, 10);

async function fetchText(route) {
  const res = await fetch(`${BASE}${route}`);
  if (!res.ok) throw new Error(`${route} → ${res.status}`);
  return res.text();
}

const README = `# interactīus · AI Kit

Paquete de marca para herramientas de IA. Generado el ${today} desde brand.interactius.com.
Brand package for AI tools. Generated ${today} from brand.interactius.com.

## Contenido / Contents

- \`llms.txt\` — el manual completo en formato para LLMs: identidad, tono, vocabulario prohibido, ejemplos aprobados/rechazados, prompts. / The full manual in LLM format.
- \`brand.json\` — tokens y reglas en JSON programático. / Tokens and rules as JSON.
- \`logo/\` — logotipo e isotipo en SVG (positivo y negativo). / Logotype and isotype SVGs.
- \`sistema-grafico/\` — las tres formas del sistema gráfico en SVG. / The three graphic-system shapes.

## Cómo usarlo / How to use

- **NotebookLM**: añade \`llms.txt\` y \`brand.json\` como fuentes del notebook.
- **Claude (Projects)**: sube el contenido del kit al Project knowledge.
- **ChatGPT / Gemini**: adjunta \`llms.txt\` al inicio de la conversación, o pega la URL https://brand.interactius.com/llms.txt
- **Validación**: el copy generado puede comprobarse contra https://brand.interactius.com/api/eval (POST).

La versión viva siempre está en https://brand.interactius.com — si este kit tiene más de unas semanas, descarga uno nuevo.
The living version is always at https://brand.interactius.com — if this kit is more than a few weeks old, download a fresh one.
`;

rmSync(path.join(ROOT, '.ai-kit-stage'), { recursive: true, force: true });
mkdirSync(STAGE, { recursive: true });

writeFileSync(path.join(STAGE, 'README.md'), README);
writeFileSync(path.join(STAGE, 'llms.txt'), await fetchText('/llms.txt'));
writeFileSync(path.join(STAGE, 'brand.json'), await fetchText('/api/brand.json'));

cpSync(path.join(ROOT, 'public/logo'), path.join(STAGE, 'logo'), { recursive: true });
cpSync(path.join(ROOT, 'public/sistema-grafico'), path.join(STAGE, 'sistema-grafico'), { recursive: true });

rmSync(OUT, { force: true });
execSync(`cd ${JSON.stringify(path.join(ROOT, '.ai-kit-stage'))} && zip -rq -X ${JSON.stringify(OUT)} AI-Kit -x "*.DS_Store"`);
rmSync(path.join(ROOT, '.ai-kit-stage'), { recursive: true, force: true });

console.log(`AI-Kit.zip generado → ${OUT}`);

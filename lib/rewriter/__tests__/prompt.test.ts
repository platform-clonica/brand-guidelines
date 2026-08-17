import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildRewriterPrompt } from '../prompt.ts';
import { applyLengthPolicy } from '../lengthPolicy.ts';
import {
  TEXT_TYPES,
  clampAxis,
  isLengthId,
  isOutputLang,
  isPresetId,
  isTextType,
  textTypeOrDefault,
  type RewriteRequest,
} from '../options.ts';
import { evalText } from '../../eval.ts';
import { forbiddenVocabulary, sentenceLength, voicePrinciple } from '../../tokens.ts';

/* Lo que se protege aquí no es la redacción del prompt, es su procedencia: la voz tiene que
   SALIR de lib/tokens.ts. Si alguien copia la lista roja a mano dentro de prompt.ts, el texto
   seguiría leyéndose bien pero dejaría de actualizarse al tocar los tokens — y este test
   seguiría pasando solo mientras las dos copias coincidan. De ahí que se compare contra el
   token importado, nunca contra un literal escrito en el test. */

const base: RewriteRequest = {
  draft: 'Hola, te escribo para confirmar la reunión.',
  context: '',
  textType: 'correo',
  preset: 'cliente',
  formality: 3,
  warmth: 3,
  lang: 'auto',
  length: 'igual',
  brandVoice: true,
};

test('la voz de marca sale de los tokens, no de una copia', () => {
  const prompt = buildRewriterPrompt(base);
  for (const word of forbiddenVocabulary) {
    assert.ok(prompt.includes(word), `falta "${word}" en la lista roja del prompt`);
  }
  assert.ok(prompt.includes(voicePrinciple.es), 'falta el principio de voz');
  assert.ok(
    prompt.includes(`${sentenceLength.min}–${sentenceLength.max}`),
    'falta el rango de longitud de frase',
  );
});

test('sin voz de marca no viaja ninguna regla dura', () => {
  const prompt = buildRewriterPrompt({ ...base, brandVoice: false });
  assert.ok(!prompt.includes(voicePrinciple.es));
  for (const word of forbiddenVocabulary) {
    assert.ok(!prompt.includes(word), `"${word}" no debería estar con la voz desactivada`);
  }
});

test('el bloque de voz se escribe en el idioma de salida cuando está fijado', () => {
  assert.ok(buildRewriterPrompt({ ...base, lang: 'en' }).includes(voicePrinciple.en));
  assert.ok(buildRewriterPrompt({ ...base, lang: 'ca' }).includes(voicePrinciple.ca));
  // `auto` no sabe el idioma todavía, así que la voz va en el de la marca.
  assert.ok(buildRewriterPrompt({ ...base, lang: 'auto' }).includes(voicePrinciple.es));
});

test('el idioma auto pide detectar; el fijado, redactar', () => {
  assert.match(buildRewriterPrompt(base), /Detecta el idioma del borrador/);
  assert.match(buildRewriterPrompt({ ...base, lang: 'ca' }), /Redacta el texto en catalán/);
});

test('el perfil aporta su instrucción, y solo la suya', () => {
  const prompt = buildRewriterPrompt({ ...base, preset: 'mala-noticia' });
  assert.match(prompt, /"Mala noticia"/);
  assert.match(prompt, /cuida el impacto/);
  assert.ok(!prompt.includes('venta agresiva'), 'se ha colado el hint del perfil comercial');
});

test('los ejes cambian el texto que ve el modelo', () => {
  const frio = buildRewriterPrompt({ ...base, formality: 1, warmth: 1 });
  const calido = buildRewriterPrompt({ ...base, formality: 5, warmth: 5 });
  assert.match(frio, /Formalidad: muy cercano e informal/);
  assert.match(calido, /Formalidad: muy formal/);
  assert.notEqual(frio, calido);
});

test('el bloque de contexto solo aparece si hay contexto', () => {
  assert.ok(!buildRewriterPrompt(base).includes('CONTEXTO DEL TEXTO'));
  const conContexto = buildRewriterPrompt({ ...base, context: '  cliente escéptico  ' });
  assert.ok(conContexto.includes('CONTEXTO DEL TEXTO'));
  assert.ok(conContexto.includes('cliente escéptico'));
});

/* ─── Tipo de texto ───
   El riesgo de este eje es que acabe decorativo, como el `_type` que compileDeck recibe y
   ignora. Estos cinco tests lo impiden: si el tipo dejara de llegar al prompt o de gobernar el
   eval, alguno cae. */

test('cada tipo de texto produce un prompt distinto', () => {
  // Exhaustivo sobre la tabla: se auto-extiende al añadir un tipo, y un valor decorativo
  // (todos los prompts iguales) lo suspende.
  const prompts = TEXT_TYPES.map((t) => buildRewriterPrompt({ ...base, textType: t.id }));
  assert.equal(new Set(prompts).size, TEXT_TYPES.length);
});

test('el prompt lleva la instrucción estructural del tipo elegido', () => {
  for (const t of TEXT_TYPES) {
    const prompt = buildRewriterPrompt({ ...base, textType: t.id });
    assert.ok(prompt.includes(t.hint), `${t.id}: falta su hint en el prompt`);
  }
});

test('no se cuela la instrucción de otro tipo', () => {
  const prompt = buildRewriterPrompt({ ...base, textType: 'mensaje' });
  const correo = TEXT_TYPES.find((t) => t.id === 'correo')!;
  assert.ok(!prompt.includes(correo.hint), 'se ha colado el hint del correo en un mensaje');
});

test('solo el correo pide asunto', () => {
  for (const t of TEXT_TYPES) {
    const prompt = buildRewriterPrompt({ ...base, textType: t.id });
    assert.equal(
      prompt.includes('devuelve "subject" como cadena vacía'),
      !t.hasSubject,
      `${t.id}: la regla del asunto no sigue a hasSubject`,
    );
  }
});

test('la regla de longitud del prompt y la del eval salen de la misma tabla', () => {
  /* Este es el test que importa. Si el prompt admite fragmentos pero el eval sigue penalizando
     las frases cortas, el usuario ve una nota baja sobre un texto que la herramienta le pidió
     al modelo. Las dos caras tienen que moverse juntas. */
  const corto = evalText('Frase corta.');
  assert.ok(
    corto.violations.some((v) => v.rule === 'length:under_min'),
    'el fixture debería disparar under_min',
  );

  const rangoEstricto = `${sentenceLength.min}–${sentenceLength.max}`;

  for (const t of TEXT_TYPES) {
    const prompt = buildRewriterPrompt({ ...base, textType: t.id });
    const promptAdmiteFragmentos = !prompt.includes(rangoEstricto);
    const evalPerdonaFragmentos = !applyLengthPolicy(corto, t.id).violations.some(
      (v) => v.rule === 'length:under_min',
    );

    assert.equal(promptAdmiteFragmentos, evalPerdonaFragmentos, `${t.id}: prompt y eval discrepan`);
    assert.equal(evalPerdonaFragmentos, t.allowFragments, `${t.id}: no sigue a allowFragments`);
  }
});

test('el prompt no crece sin que nadie se entere', () => {
  /* Tope deliberado. Hoy ronda los 4.700 caracteres; inyectar ejemplos few-shot lo dispararía.
     La idea es que crecer sea una decisión y no una deriva. */
  const MAX = 6000;
  for (const t of TEXT_TYPES) {
    const prompt = buildRewriterPrompt({ ...base, textType: t.id, context: 'x'.repeat(500) });
    assert.ok(prompt.length <= MAX, `${t.id}: el prompt mide ${prompt.length}, tope ${MAX}`);
  }
});

test('los validadores rechazan lo que no está declarado', () => {
  assert.ok(isTextType('presentacion'));
  assert.ok(!isTextType('tuit'));
  assert.equal(textTypeOrDefault('mensaje'), 'mensaje');
  assert.equal(textTypeOrDefault('tuit'), 'correo', 'lo desconocido cae al comportamiento previo');
  assert.equal(textTypeOrDefault(undefined), 'correo');

  assert.ok(isPresetId('comercial'));
  assert.ok(!isPresetId('jefe'));
  assert.ok(isOutputLang('auto') && isOutputLang('ca'));
  assert.ok(!isOutputLang('pt'));
  assert.ok(isLengthId('corto'));
  assert.ok(!isLengthId('larguísimo'));
});

test('clampAxis acota y cae al centro cuando el valor no sirve', () => {
  assert.equal(clampAxis(0), 1);
  assert.equal(clampAxis(9), 5);
  assert.equal(clampAxis(3.4), 3);
  assert.equal(clampAxis('4'), 3, 'una cadena no es un eje');
  assert.equal(clampAxis(undefined), 3);
  assert.equal(clampAxis(Number.NaN), 3);
});

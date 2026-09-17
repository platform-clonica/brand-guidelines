/* Clock_r — la jornada teórica y el rango de consulta, validados antes de tocar la base de datos.

   `schedules` ES LA ÚNICA FILA DE TODA LA HERRAMIENTA QUE SE REESCRIBE. Todo lo demás es un libro
   de asientos que solo admite inserciones; esto no, porque es configuración y no registro. Y de ahí
   sale la consecuencia incómoda: editar un tramo ya vencido cambia el saldo de meses cerrados sin
   dejar rastro, en la única tabla que no tiene un histórico detrás que lo explique.

   Por eso la validación de aquí no es cosmética. Un array de tramos desordenado o con solapes hace
   que `scheduleAt` elija un tramo u otro según cómo quedaran guardados, y el saldo de un día pasado
   dejaría de ser reproducible. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSchedulesPatch, parseRange } from '../server.ts';

const semana = { mon: 480, tue: 480, wed: 480, thu: 480, fri: 480, sat: 0, sun: 0 };

const ok = <T extends { ok: boolean }>(r: T) => {
  assert.equal(r.ok, true, `esperaba que pasara: ${'error' in r ? String(r.error) : ''}`);
  return r as Extract<T, { ok: true }>;
};

const falla = <T extends { ok: boolean }>(r: T) => {
  assert.equal(r.ok, false, 'esperaba que lo rechazara');
  return r as Extract<T, { ok: false }>;
};

/* ─── La jornada teórica ─── */

test('una jornada con un solo tramo se acepta', () => {
  const r = ok(buildSchedulesPatch({ schedules: [{ validFrom: '2026-01-01', weekly: semana }] }));
  assert.equal(r.schedules.length, 1);
});

test('los tramos se guardan ordenados por fecha aunque lleguen al revés', () => {
  /* Guardarlos como vengan haría que el saldo de un día pasado dependiera del orden en que alguien
     los tecleó. `scheduleAt` ya no presupone orden, pero eso no es motivo para guardarlo revuelto:
     lo que se guarda es lo que alguien leerá dentro de un año. */
  const r = ok(
    buildSchedulesPatch({
      schedules: [
        { validFrom: '2026-06-01', weekly: semana },
        { validFrom: '2026-01-01', weekly: semana },
      ],
    }),
  );

  assert.deepEqual(
    r.schedules.map((t) => t.validFrom),
    ['2026-01-01', '2026-06-01'],
  );
});

test('dos tramos con la misma fecha de inicio se rechazan', () => {
  // Con dos tramos vigentes el mismo día, el saldo de ese día deja de ser reproducible.
  const r = falla(
    buildSchedulesPatch({
      schedules: [
        { validFrom: '2026-01-01', weekly: semana },
        { validFrom: '2026-01-01', weekly: { ...semana, fri: 300 } },
      ],
    }),
  );
  assert.equal(r.status, 400);
});

test('una jornada sin ningún tramo se rechaza', () => {
  /* Dejar a alguien sin tramos lo deja sin jornada teórica, y todos sus días pasarían a ser
     incidencia. Es justo lo que la migración de la jornada por defecto vino a evitar. */
  assert.equal(falla(buildSchedulesPatch({ schedules: [] })).status, 400);
});

test('unos minutos que no son minutos se rechazan', () => {
  for (const malo of [{ ...semana, mon: -60 }, { ...semana, mon: 9.5 }, { ...semana, mon: 2000 }]) {
    assert.equal(
      falla(buildSchedulesPatch({ schedules: [{ validFrom: '2026-01-01', weekly: malo }] })).status,
      400,
      `con ${JSON.stringify(malo.mon)}`,
    );
  }
});

test('una fecha de inicio ilegible se rechaza', () => {
  const r = falla(buildSchedulesPatch({ schedules: [{ validFrom: '01/01/2026', weekly: semana }] }));
  assert.equal(r.status, 400);
});

test('un cuerpo que no es un objeto se rechaza sin lanzar', () => {
  for (const cuerpo of [null, 'vaya', 42, []]) {
    assert.equal(falla(buildSchedulesPatch(cuerpo)).status, 400, `con ${JSON.stringify(cuerpo)}`);
  }
});

/* ─── La jornada intensiva ───

   Va aquí y no en un ciclo posterior por un motivo concreto: `calendar.ts` ya calcula con ella, así
   que una validación que la dejara fuera la BORRARÍA al guardar, en silencio y sin que nada fallara.
   Es la misma pérdida callada de datos que ya ha habido que tapar tres veces en este módulo, y la
   diferencia es que esta la estaría metiendo yo a sabiendas. */

const intensiva = {
  from: '06-15',
  to: '09-15',
  weekly: { mon: 420, tue: 420, wed: 420, thu: 420, fri: 300, sat: 0, sun: 0 },
};

test('un tramo con jornada intensiva la conserva al guardarse', () => {
  const r = ok(
    buildSchedulesPatch({ schedules: [{ validFrom: '2026-01-01', weekly: semana, intensive: intensiva }] }),
  );

  assert.deepEqual(r.schedules[0].intensive, intensiva, 'la jornada intensiva no puede perderse');
});

test('una jornada intensiva que cruza el fin de año se acepta', () => {
  // calendar.ts ya la resuelve; lo que no puede es quedarse fuera al guardarla.
  const r = ok(
    buildSchedulesPatch({
      schedules: [
        { validFrom: '2026-01-01', weekly: semana, intensive: { ...intensiva, from: '12-15', to: '01-15' } },
      ],
    }),
  );

  assert.equal(r.schedules[0].intensive?.from, '12-15');
});

test('una jornada intensiva con fechas ilegibles se rechaza', () => {
  for (const malo of [{ ...intensiva, from: '15/06' }, { ...intensiva, to: '2026-09-15' }]) {
    assert.equal(
      falla(buildSchedulesPatch({ schedules: [{ validFrom: '2026-01-01', weekly: semana, intensive: malo }] }))
        .status,
      400,
      `con ${JSON.stringify(malo.from)}/${JSON.stringify(malo.to)}`,
    );
  }
});

/* ─── El rango de consulta ─── */

test('un rango normal se acepta', () => {
  const r = ok(parseRange({ from: '2026-07-01', to: '2026-07-31' }));
  assert.equal(r.from, '2026-07-01');
  assert.equal(r.to, '2026-07-31');
});

test('un rango del revés se rechaza', () => {
  assert.equal(falla(parseRange({ from: '2026-07-31', to: '2026-07-01' })).status, 400);
});

test('un rango desmesurado se rechaza en vez de barrer años de asientos', () => {
  /* Sin tope, una sola petición recorrería el histórico entero de una persona. Cuatro años de
     conservación es mucho que traer para pintar un mes. */
  assert.equal(falla(parseRange({ from: '2020-01-01', to: '2026-12-31' })).status, 400);
});

test('unas fechas ilegibles se rechazan', () => {
  assert.equal(falla(parseRange({ from: 'ayer', to: 'hoy' })).status, 400);
  assert.equal(falla(parseRange({})).status, 400);
});

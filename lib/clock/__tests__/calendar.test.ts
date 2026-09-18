/* Clock_r — la jornada teórica vigente en una fecha.

   La primera pieza del bloque 2. El saldo de un día pasado tiene que calcularse con la jornada que
   estaba vigente ESE día, no con la de hoy: si alguien pasa de jornada completa a reducida en
   junio, mayo no puede recalcularse solo. De ahí que `schedules` sea un array de tramos con
   `validFrom` y no un horario suelto (plan, §1). */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hhmmFromMinutes,
  minutesFromHHMM,
  scheduleAt,
  theoreticalMinutes,
  type ScheduleTramo,
} from '../calendar.ts';

const completa: ScheduleTramo = {
  validFrom: '2000-01-01',
  weekly: { mon: 480, tue: 480, wed: 480, thu: 480, fri: 480, sat: 0, sun: 0 },
};

const reducida: ScheduleTramo = {
  validFrom: '2026-06-01',
  weekly: { mon: 360, tue: 360, wed: 360, thu: 360, fri: 360, sat: 0, sun: 0 },
};

test('un día posterior al cambio usa el tramo nuevo', () => {
  assert.equal(scheduleAt([completa, reducida], '2026-07-10'), reducida);
});

test('un día anterior al cambio sigue usando el tramo viejo', () => {
  // Esto es lo que impide que cambiar la jornada reescriba el saldo de los meses ya cerrados.
  assert.equal(scheduleAt([completa, reducida], '2026-03-01'), completa);
});

test('el día exacto del cambio ya usa el tramo nuevo', () => {
  // `validFrom` incluye su propio día: si no, habría un día sin jornada definida en cada cambio.
  assert.equal(scheduleAt([completa, reducida], '2026-06-01'), reducida);
});

test('una fecha anterior a todos los tramos no tiene jornada', () => {
  /* No se inventa una: devolver 0 o el tramo más antiguo daría un saldo calculado sobre algo que
     nadie decidió. Quien llama lo convierte en incidencia. */
  assert.equal(scheduleAt([reducida], '2026-01-15'), null);
});

test('los tramos desordenados dan el mismo resultado que ordenados', () => {
  // Nadie garantiza el orden de un array que vive en una columna JSONB y edita una persona.
  assert.equal(scheduleAt([reducida, completa], '2026-07-10'), reducida);
  assert.equal(scheduleAt([reducida, completa], '2026-03-01'), completa);
});

test('sin tramos no hay jornada, y no lanza', () => {
  assert.equal(scheduleAt([], '2026-07-10'), null);
});

/* ─── Minutos teóricos de un día concreto ───

   Lo que `scheduleAt` devuelve es una semana tipo; esto la baja a un día, aplicando lo que lo
   vacía: el fin de semana, el festivo y la ausencia. Los tres dan 0 por motivos distintos, y esa
   distinción importa fuera de aquí — un festivo no es lo mismo que una ausencia en el informe que
   se exporta— pero el saldo del día es el mismo: no se debe nada. */

const intensiva: ScheduleTramo = {
  validFrom: '2000-01-01',
  weekly: { mon: 480, tue: 480, wed: 480, thu: 480, fri: 480, sat: 0, sun: 0 },
  intensive: {
    from: '06-15',
    to: '09-15',
    weekly: { mon: 420, tue: 420, wed: 420, thu: 420, fri: 300, sat: 0, sun: 0 },
  },
};

test('un día laborable debe los minutos de su día de la semana', () => {
  // 2026-07-10 es viernes.
  assert.equal(theoreticalMinutes(completa, '2026-07-10', { holidays: [], absences: [] }), 480);
});

test('un sábado no debe nada', () => {
  // 2026-07-11 es sábado.
  assert.equal(theoreticalMinutes(completa, '2026-07-11', { holidays: [], absences: [] }), 0);
});

test('un festivo no debe nada aunque caiga en día laborable', () => {
  // 2026-08-15 es sábado, así que se usa uno que cae entre semana: el 12 de octubre de 2026 es lunes.
  assert.equal(
    theoreticalMinutes(completa, '2026-10-12', { holidays: ['2026-10-12'], absences: [] }),
    0,
  );
});

test('un día dentro de una ausencia no debe nada', () => {
  assert.equal(
    theoreticalMinutes(completa, '2026-07-10', {
      holidays: [],
      absences: [{ fromDate: '2026-07-06', toDate: '2026-07-17' }],
    }),
    0,
  );
});

test('los extremos de una ausencia entran dentro', () => {
  // Si `toDate` no contara, el último día de vacaciones de todo el mundo saldría como incidencia.
  const ausencia = { holidays: [], absences: [{ fromDate: '2026-07-06', toDate: '2026-07-10' }] };
  assert.equal(theoreticalMinutes(completa, '2026-07-06', ausencia), 0);
  assert.equal(theoreticalMinutes(completa, '2026-07-10', ausencia), 0);
});

test('el día siguiente al final de una ausencia vuelve a deber jornada', () => {
  assert.equal(
    theoreticalMinutes(completa, '2026-07-13', {
      holidays: [],
      absences: [{ fromDate: '2026-07-06', toDate: '2026-07-10' }],
    }),
    480,
  );
});

test('la jornada intensiva manda dentro de su periodo', () => {
  // 2026-07-10, viernes de julio: dentro del 15/06–15/09.
  assert.equal(theoreticalMinutes(intensiva, '2026-07-10', { holidays: [], absences: [] }), 300);
});

test('fuera del periodo intensivo vuelve la jornada normal', () => {
  // 2026-10-09 es viernes, ya fuera del periodo.
  assert.equal(theoreticalMinutes(intensiva, '2026-10-09', { holidays: [], absences: [] }), 480);
});

test('los extremos del periodo intensivo entran dentro', () => {
  // 2026-06-15 es lunes y 2026-09-15 es martes: los dos son días laborables.
  assert.equal(theoreticalMinutes(intensiva, '2026-06-15', { holidays: [], absences: [] }), 420);
  assert.equal(theoreticalMinutes(intensiva, '2026-09-15', { holidays: [], absences: [] }), 420);
});

/* ─── Horas de reloj y minutos ───

   La jornada se guarda en minutos —sin decimales, porque acaba en un saldo legal— y se edita en
   horas y minutos, que es como la gente la piensa. La conversión decide la jornada teórica de una
   persona, y si se equivoca su saldo sale mal SIN QUE NADA FALLE: nadie revisa un 7:30 que debía
   ser 8:00. De ahí que esté aquí con sus tests y no dentro de un formulario. */

test('una jornada de ocho horas son cuatrocientos ochenta minutos', () => {
  assert.equal(minutesFromHHMM('08:00'), 480);
});

test('la media hora cuenta', () => {
  assert.equal(minutesFromHHMM('07:30'), 450);
});

test('cero es cero, no nulo', () => {
  // Un sábado son 0 minutos, que es un valor legítimo y distinto de «no hay dato».
  assert.equal(minutesFromHHMM('00:00'), 0);
});

test('van y vuelven sin perder nada', () => {
  for (const minutos of [0, 450, 480, 510, 1440]) {
    assert.equal(minutesFromHHMM(hhmmFromMinutes(minutos)), minutos, `con ${minutos}`);
  }
});

test('los minutos se escriben con dos cifras', () => {
  // '7:5' en un campo de hora es un error de lectura esperando a ocurrir.
  assert.equal(hhmmFromMinutes(450), '07:30');
  assert.equal(hhmmFromMinutes(0), '00:00');
  assert.equal(hhmmFromMinutes(480), '08:00');
});

test('una hora ilegible da null en vez de lanzar', () => {
  for (const malo of ['', 'ocho', '8', '08:', ':30', '08:60', '25:00', '-01:00']) {
    assert.equal(minutesFromHHMM(malo), null, `con ${JSON.stringify(malo)}`);
  }
});

test('veinticuatro horas es el techo, y cabe', () => {
  /* El día tiene 24 horas: más que eso no es una jornada, es un error de tecleo. El tope coincide
     con el que ya valida buildSchedulesPatch en el servidor. */
  assert.equal(minutesFromHHMM('24:00'), 1440);
  assert.equal(minutesFromHHMM('24:01'), null);
});

/* ─── Un periodo intensivo que cruza el fin de año ───

   Comparar `MM-DD` como texto funciona mientras el periodo empieza y acaba el mismo año. Uno de
   Navidad no: `12-15` es mayor que `01-15`, así que la comparación de rango da falso para TODOS los
   días y el periodo entero se evapora sin avisar. La jornada reducida de Navidad es lo bastante
   corriente como para que esto no pueda quedarse en un comentario.

   Las fechas están comprobadas, no supuestas: 2026-12-14 lunes · 12-15 martes · 12-21 lunes ·
   2027-01-08 viernes · 01-15 viernes. El 2027-01-18 sale de contar tres días desde el viernes 15. */

const invernal: ScheduleTramo = {
  validFrom: '2000-01-01',
  weekly: { mon: 480, tue: 480, wed: 480, thu: 480, fri: 480, sat: 0, sun: 0 },
  intensive: {
    from: '12-15',
    to: '01-15',
    weekly: { mon: 360, tue: 360, wed: 360, thu: 360, fri: 300, sat: 0, sun: 0 },
  },
};

const sinNada = { holidays: [], absences: [] };

test('el lado de diciembre de un periodo que cruza el año usa la jornada intensiva', () => {
  assert.equal(theoreticalMinutes(invernal, '2026-12-21', sinNada), 360);
});

test('el lado de enero de un periodo que cruza el año usa la jornada intensiva', () => {
  assert.equal(theoreticalMinutes(invernal, '2027-01-08', sinNada), 300);
});

test('los extremos de un periodo que cruza el año entran dentro', () => {
  assert.equal(theoreticalMinutes(invernal, '2026-12-15', sinNada), 360);
  assert.equal(theoreticalMinutes(invernal, '2027-01-15', sinNada), 300);
});

test('la víspera de un periodo que cruza el año todavía es jornada normal', () => {
  assert.equal(theoreticalMinutes(invernal, '2026-12-14', sinNada), 480);
});

test('el día siguiente al final de un periodo que cruza el año vuelve a ser normal', () => {
  assert.equal(theoreticalMinutes(invernal, '2027-01-18', sinNada), 480);
});

test('un día muy fuera de un periodo que cruza el año es jornada normal', () => {
  assert.equal(theoreticalMinutes(invernal, '2026-11-20', sinNada), 480);
});

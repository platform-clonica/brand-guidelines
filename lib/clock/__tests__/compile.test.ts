/* Clock_r — compileDay: la jornada resuelta a partir de sus asientos.

   El estado de un día NO se guarda en ninguna parte: se calcula leyendo la serie de asientos de ese
   `work_date`, aplicando las correcciones y descartando los anulados. Por eso esto es el corazón
   del bloque 2 y por eso su invariante principal no es «calcula bien», sino **no lanza nunca**: una
   serie incoherente tiene que producir incidencias, porque un registro horario que revienta al
   abrirlo es peor que uno que dice lo que no cuadra.

   Los asientos entran en snake_case, tal como los devuelve la base de datos, igual que
   `compileSystem` recibe su fila: lo que sale de Postgres no está validado y quien lo abre tiene
   que pasar por aquí. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileDay, compileRange } from '../compile.ts';
import type { ScheduleTramo } from '../calendar.ts';

const completa: ScheduleTramo = {
  validFrom: '2000-01-01',
  weekly: { mon: 480, tue: 480, wed: 480, thu: 480, fri: 480, sat: 0, sun: 0 },
};

/* Un asiento tal y como sale de la tabla. Solo se escriben los campos que el cálculo mira; los
   demás (hash, prev_hash, person_email) existen en la fila pero no entran aquí. */
const idOf = (seq: number) => `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`;

const asiento = (
  seq: number,
  kind: string,
  hora: string,
  extra: Record<string, unknown> = {},
) => ({
  id: idOf(seq),
  seq,
  op: 'record',
  corrects: null,
  reason: null,
  kind,
  occurred_at: `2026-07-10T${hora}:00+02:00`,
  /* En un fichaje normal coinciden: se escribe en el momento en que ocurre. Solo una corrección los
     separa, porque se escribe después de lo que corrige. */
  recorded_at: `2026-07-10T${hora}:00+02:00`,
  work_date: '2026-07-10',
  mode: 'onsite',
  source: 'app',
  ...extra,
});

const opciones = {
  workDate: '2026-07-10',
  schedules: [completa],
  absences: [],
  holidays: [],
};

test('una jornada normal con dos pausas da las horas efectivas correctas', () => {
  /* Entra a las 9, dos pausas (15 min y 60 min) y sale a las 18. Nueve horas de presencia menos
     una hora y cuarto de pausa: 465 minutos efectivos contra 480 teóricos, o sea 15 de menos.
     2026-07-10 es viernes, comprobado. */
  const resultado = compileDay(
    [
      asiento(1, 'in', '09:00'),
      asiento(2, 'break_start', '11:00'),
      asiento(3, 'break_end', '11:15'),
      asiento(4, 'break_start', '14:00'),
      asiento(5, 'break_end', '15:00'),
      asiento(6, 'out', '18:00'),
    ],
    opciones,
  );

  assert.equal(resultado.ok, true, 'una jornada normal no debería dar incidencias');
  assert.deepEqual(resultado.issues, []);
  assert.equal(resultado.day.workedMinutes, 465);
  assert.equal(resultado.day.breakMinutes, 75);
  assert.equal(resultado.day.theoreticalMinutes, 480);
  assert.equal(resultado.day.balanceMinutes, -15);
  assert.equal(resultado.day.open, false);
});

/* ─── La jornada sin cerrar ───

   El caso que más veces va a pasar de verdad: alguien entra y se va sin fichar la salida. La regla
   de la definición no admite matices — nunca se inventa una hora de salida— así que el día queda
   con un hueco declarado y una incidencia, y las horas efectivas de ese tramo son cero, no una
   estimación.

   Y es AVISO, no error: a media tarde todo el mundo tiene la jornada abierta. Un día sin terminar
   no es un día roto, así que `ok` sigue siendo true. La misma regla que usa compileSystem: `ok` es
   «no hay errores», no «no hay incidencias». */

test('un in sin out deja la jornada abierta y lo dice', () => {
  const resultado = compileDay([asiento(1, 'in', '09:00')], opciones);

  assert.equal(resultado.day.open, true);
  assert.equal(resultado.issues.length, 1, 'debería haber exactamente una incidencia');
  assert.equal(resultado.issues[0].level, 'warning');
  assert.equal(resultado.issues[0].path, 'asiento.1');
  assert.equal(resultado.ok, true, 'un día sin terminar no es un día roto');
});

test('una jornada abierta no inventa la hora de salida', () => {
  const resultado = compileDay([asiento(1, 'in', '09:00')], opciones);

  assert.equal(resultado.day.segments.length, 1);
  assert.equal(resultado.day.segments[0].to, null, 'el tramo abierto no puede tener hora de fin');
  assert.equal(resultado.day.workedMinutes, 0, 'no se cuentan horas de un tramo sin cerrar');
});

test('una pausa sin cerrar también queda abierta y lo dice', () => {
  const resultado = compileDay(
    [asiento(1, 'in', '09:00'), asiento(2, 'break_start', '14:00'), asiento(3, 'out', '18:00')],
    opciones,
  );

  assert.equal(resultado.day.open, true);
  assert.equal(resultado.day.breaks[0].to, null);
  assert.equal(resultado.issues.length, 1, 'la pausa sin cerrar es la única incidencia');
  assert.equal(resultado.issues[0].path, 'asiento.2');
});

/* ─── Correcciones y anulaciones ───

   Aquí está el motivo de que la tabla solo admita inserciones. Corregir una hora NO reescribe el
   asiento: escribe uno nuevo que apunta al viejo con su motivo, y el cálculo usa el nuevo mientras
   el viejo sigue existiendo. Es lo que permite a la vez que las cuentas cuadren y que se pueda
   reconstruir quién cambió qué y por qué. */

test('una corrección sustituye al asiento original en el cálculo', () => {
  /* Entra a las 9 y ficha la salida a las 18, pero la salida real eran las 17 y lo corrige. El
     cálculo tiene que usar las 17: 480 minutos, justo la jornada, saldo cero. */
  const resultado = compileDay(
    [
      asiento(1, 'in', '09:00'),
      asiento(2, 'out', '18:00'),
      asiento(3, 'out', '17:00', {
        op: 'amend',
        corrects: idOf(2),
        reason: 'La salida real fueron las cinco',
      }),
    ],
    opciones,
  );

  assert.equal(resultado.day.workedMinutes, 480, 'debería contar hasta las 17, no hasta las 18');
  assert.equal(resultado.day.balanceMinutes, 0);
});

test('el asiento corregido sigue estando, aunque no cuente', () => {
  // Si desapareciera, el registro dejaría de poder explicar por qué cambió una hora.
  const resultado = compileDay(
    [
      asiento(1, 'in', '09:00'),
      asiento(2, 'out', '18:00'),
      asiento(3, 'out', '17:00', { op: 'amend', corrects: idOf(2), reason: 'Corrijo la salida' }),
    ],
    opciones,
  );

  assert.deepEqual(resultado.day.supersededIds, [idOf(2)]);
});

test('un asiento anulado desaparece del cálculo', () => {
  /* Doble clic al entrar: dos `in` seguidos. Se anula el segundo y el día queda como si no se
     hubiera escrito: 09:00 a 18:00, 540 minutos, y sin tramo abierto. */
  const resultado = compileDay(
    [
      asiento(1, 'in', '09:00'),
      asiento(2, 'out', '18:00'),
      asiento(3, 'in', '09:05'),
      asiento(4, 'in', '09:05', {
        op: 'annul',
        corrects: idOf(3),
        reason: 'Fichaje duplicado por doble clic',
      }),
    ],
    opciones,
  );

  assert.equal(resultado.day.workedMinutes, 540);
  assert.equal(resultado.day.open, false, 'el `in` duplicado estaba anulado: no deja nada abierto');
});

test('una corrección que se apunta a sí misma no cuelga', () => {
  /* De todos los casos raros, este es el único que no lanza sino que se queda dando vueltas, y
     colgar la pantalla de alguien es peor que reventarla: al menos un error se ve. */
  assert.doesNotThrow(() => {
    const resultado = compileDay(
      [
        asiento(1, 'in', '09:00'),
        asiento(2, 'out', '17:00', { op: 'amend', corrects: idOf(2), reason: 'Se apunta a sí mismo' }),
      ],
      opciones,
    );
    assert.ok(
      resultado.issues.some((i) => i.level === 'error'),
      'una corrección circular tiene que salir como error',
    );
  });
});

test('una corrección que apunta a un asiento que no existe lo dice', () => {
  const resultado = compileDay(
    [
      asiento(1, 'in', '09:00'),
      asiento(2, 'out', '17:00', {
        op: 'amend',
        corrects: idOf(99),
        reason: 'Apunta a un asiento de otro día',
      }),
    ],
    opciones,
  );

  assert.ok(
    resultado.issues.some((i) => i.level === 'error' && i.path === 'asiento.2'),
    'debería señalar el asiento que corrige a nadie',
  );
});

/* ─── Series que no cuadran ───

   Los tres van como ERROR y no como aviso, y la razón es la misma en los tres: no es que falte un
   dato, es que el número de horas del día deja de ser fiable. En un registro que puede acabar
   delante de un inspector, un total ambiguo presentado como bueno es peor que un total que se
   declara roto. `ok` en false es exactamente eso. */

test('dos entradas seguidas sin salida son un error, y no se pierde la primera', () => {
  /* El caso del doble clic, o de dos pestañas. Hasta ahora el emparejador machacaba la primera
     entrada en silencio y el día salía cuadrado: 09:05 a 18:00 en vez de 09:00 a 18:00. Un fichaje
     desaparecido sin que nadie lo sepa es justo lo que esta herramienta no puede permitirse. */
  const resultado = compileDay(
    [asiento(1, 'in', '09:00'), asiento(2, 'in', '09:05'), asiento(3, 'out', '18:00')],
    opciones,
  );

  assert.equal(resultado.ok, false, 'con dos entradas el total es ambiguo');
  assert.ok(
    resultado.issues.some((i) => i.level === 'error' && i.path === 'asiento.2'),
    'debería señalar la segunda entrada',
  );
});

test('una salida anterior a su entrada es un error', () => {
  // Sale de corregir mal una hora. Sin esto, el tramo daría minutos negativos y restaría del día.
  const resultado = compileDay(
    [asiento(1, 'in', '09:00'), asiento(2, 'out', '08:00')],
    opciones,
  );

  assert.equal(resultado.ok, false);
  assert.ok(
    resultado.issues.some((i) => i.level === 'error' && i.path === 'asiento.2'),
    'debería señalar la salida imposible',
  );
});

test('una pausa fuera de todo tramo de trabajo es un error', () => {
  /* Entra a las 9, sale a las 12, y la pausa está a las 14: fuera de la jornada. Restarla daría un
     día de dos horas trabajadas en vez de tres, así que el total mentiría hacia abajo. */
  const resultado = compileDay(
    [
      asiento(1, 'in', '09:00'),
      asiento(2, 'out', '12:00'),
      asiento(3, 'break_start', '14:00'),
      asiento(4, 'break_end', '15:00'),
    ],
    opciones,
  );

  assert.equal(resultado.ok, false);
  assert.ok(
    resultado.issues.some((i) => i.level === 'error' && i.path === 'asiento.3'),
    'debería señalar la pausa que cae fuera',
  );
});

/* ─── Lo que hoy desaparece en silencio ───

   Los dos primeros son huecos en código que ya está escrito y en verde, que es peor que un caso sin
   cubrir: no es que falte la comprobación, es que el dato se pierde sin dejar rastro y el día sale
   cuadrado. */

test('una salida sin entrada es un error y no se traga', () => {
  /* Hoy el emparejador descarta un cierre que no abre nada y sigue como si no hubiera pasado. En un
     libro de asientos, un fichaje que se evapora del cálculo sin decirlo es exactamente lo que no
     puede ocurrir. */
  const resultado = compileDay([asiento(1, 'out', '18:00')], opciones);

  assert.equal(resultado.ok, false);
  assert.ok(
    resultado.issues.some((i) => i.level === 'error' && i.path === 'asiento.1'),
    'debería señalar la salida que no cierra nada',
  );
});

test('una persona sin tramo de jornada vigente lo dice en vez de suponer cero', () => {
  /* Cuando no hay tramo vigente, poner los teóricos a 0 en silencio da un saldo calculado contra
     una jornada que nadie decidió. Es la misma razón por la que scheduleAt devuelve null y no 0:
     un hueco declarado vale más que un número inventado. */
  const resultado = compileDay([asiento(1, 'in', '09:00'), asiento(2, 'out', '17:00')], {
    ...opciones,
    schedules: [{ ...completa, validFrom: '2027-01-01' }],
  });

  assert.equal(resultado.ok, false);
  assert.ok(
    resultado.issues.some((i) => i.level === 'error' && i.path === 'jornada'),
    'debería decir que no hay jornada teórica contra la que comparar',
  );
});

test('fichar dentro de una ausencia declarada es un aviso, no un error', () => {
  /* Las horas trabajadas son reales; lo que está en duda es la ausencia. Por eso avisa y `ok` sigue
     siendo true: alguien tiene que mirar si sobra la ausencia o sobran los fichajes, pero el total
     del día no es ambiguo. */
  const resultado = compileDay([asiento(1, 'in', '09:00'), asiento(2, 'out', '17:00')], {
    ...opciones,
    absences: [{ fromDate: '2026-07-06', toDate: '2026-07-17' }],
  });

  assert.equal(resultado.ok, true, 'las horas trabajadas son reales: no es un error');
  assert.ok(
    resultado.issues.some((i) => i.level === 'warning' && i.path === 'ausencia'),
    'debería avisar de que ese día constaba como ausencia',
  );
});

/* ─── Filas que no son asientos ───

   La cabecera de compile.ts dice que lo que sale de Postgres no está validado y que quien lo abre
   tiene que pasar por aquí. Hasta ahora eso era una declaración de intenciones: `compileDay` hace
   un cast y confía. Estos tests son los que la convierten en algo comprobado.

   No es un caso hipotético. Las filas pueden venir de un día antiguo, de una columna que cambió, o
   de alguien mirando la tabla a mano. Y la invariante de este módulo no es que calcule bien: es que
   NO LANCE NUNCA, porque un registro horario que revienta al abrirlo no se puede ni consultar ni
   corregir. */

test('una fila que no es un asiento no revienta el cálculo', () => {
  assert.doesNotThrow(() => {
    compileDay([null, 'vaya', 42, { sin: 'nada' }], opciones);
  });
});

test('las filas que no son asientos se descartan y se dicen', () => {
  const resultado = compileDay([null, asiento(1, 'in', '09:00'), asiento(2, 'out', '17:00')], opciones);

  assert.ok(
    resultado.issues.some((i) => i.level === 'error'),
    'una fila ilegible tiene que salir como error',
  );
  // Y los asientos buenos de esa misma lista se siguen calculando.
  assert.equal(resultado.day.workedMinutes, 480);
});

test('una fila sin hora no produce minutos imposibles', () => {
  /* `Date.parse(undefined)` es NaN, y un NaN se propaga callado hasta el saldo. Un número imposible
     presentado como bueno es peor que un error: nadie lo mira dos veces. */
  const resultado = compileDay(
    [
      { id: idOf(1), seq: 1, op: 'record', corrects: null, kind: 'in', work_date: '2026-07-10' },
      asiento(2, 'out', '17:00'),
    ],
    opciones,
  );

  assert.ok(Number.isFinite(resultado.day.workedMinutes), 'los minutos no pueden ser NaN');
  assert.ok(Number.isFinite(resultado.day.balanceMinutes), 'el saldo no puede ser NaN');
  assert.ok(
    resultado.issues.some((i) => i.level === 'error' && i.path === 'asiento.1'),
    'debería señalar el asiento sin hora',
  );
});

test('un tipo de fichaje desconocido se descarta y se dice', () => {
  const resultado = compileDay(
    [asiento(1, 'in', '09:00'), asiento(2, 'almuerzo', '14:00'), asiento(3, 'out', '17:00')],
    opciones,
  );

  assert.equal(resultado.day.workedMinutes, 480, 'el asiento raro no debería alterar el total');
  assert.ok(
    resultado.issues.some((i) => i.level === 'error' && i.path === 'asiento.2'),
    'debería señalar el tipo que no existe',
  );
});

/* ─── Asientos que contradicen su propio contexto ───

   Los tres primeros no son series mal emparejadas: son asientos que, por sí solos, dicen algo
   imposible. Un fichaje que ocurre después de haberse escrito, uno que pertenece a otro día, o dos
   que son el mismo. */

test('un fichaje que ocurre después de haberse escrito es un error', () => {
  /* El servidor pone `recorded_at` con now(), así que esto solo sale de un reloj desajustado o de
     alguien escribiendo una hora que aún no ha pasado. En un registro que puede acabar delante de
     un inspector, una hora futura no se deja pasar. */
  const resultado = compileDay(
    [
      asiento(1, 'in', '09:00'),
      asiento(2, 'out', '20:00', { recorded_at: '2026-07-10T09:00:00+02:00' }),
    ],
    opciones,
  );

  assert.equal(resultado.ok, false);
  assert.ok(
    resultado.issues.some((i) => i.level === 'error' && i.path === 'asiento.2'),
    'debería señalar el asiento con hora futura',
  );
});

test('un asiento de otro día no cuenta en este', () => {
  /* compileDay recibe los asientos de UN work_date. Uno de otro día aquí significa que la consulta
     trajo de más o que el asiento se escribió mal, y en los dos casos el total de este día saldría
     inflado sin que nadie lo supiera. */
  const resultado = compileDay(
    [
      asiento(1, 'in', '09:00'),
      asiento(2, 'out', '17:00'),
      asiento(3, 'in', '22:00', { work_date: '2026-07-11' }),
    ],
    opciones,
  );

  assert.ok(
    resultado.issues.some((i) => i.level === 'error' && i.path === 'asiento.3'),
    'debería señalar el asiento que no es de este día',
  );
  assert.equal(resultado.day.workedMinutes, 480, 'el asiento de otro día no puede sumar aquí');
});

test('dos asientos idénticos no pasan por buenos', () => {
  // Guardia: el doble clic que escribe dos veces lo mismo ya lo cazan las otras comprobaciones.
  const resultado = compileDay(
    [asiento(1, 'in', '09:00'), asiento(2, 'in', '09:00'), asiento(3, 'out', '17:00')],
    opciones,
  );

  assert.equal(resultado.ok, false);
});

test('un turno que cruza el cambio de hora cuenta las horas reales, no las del reloj', () => {
  /* 2026-10-25 es el domingo en que España atrasa el reloj: el desfase pasa de +02:00 a +01:00 y
     la madrugada dura una hora más. De 22:00 a 06:00 el reloj marca 8 horas, pero se han trabajado
     9. El cálculo sale de instantes y no de reloj de pared, así que tiene que dar 540.

     Fechas y desfases comprobados contra Europe/Madrid, no supuestos. */
  const resultado = compileDay(
    [
      {
        id: idOf(1), seq: 1, op: 'record', corrects: null, reason: null, kind: 'in',
        occurred_at: '2026-10-24T22:00:00+02:00', recorded_at: '2026-10-24T22:00:00+02:00',
        work_date: '2026-10-24',
      },
      {
        id: idOf(2), seq: 2, op: 'record', corrects: null, reason: null, kind: 'out',
        occurred_at: '2026-10-25T06:00:00+01:00', recorded_at: '2026-10-25T06:00:00+01:00',
        work_date: '2026-10-24',
      },
    ],
    { ...opciones, workDate: '2026-10-24' },
  );

  assert.equal(resultado.day.workedMinutes, 540, 'de 22:00 a 06:00 cruzando el cambio son 9 horas');
});

/* ─── La semana y el mes ───

   «Mi jornada» enseña el día, la semana y el mes con su saldo, así que hace falta sumar varios días
   y no solo resolver uno.

   La decisión que fija esta tanda, y que no es obvia: EL RANGO SE ENUMERA POR FECHAS, NO POR LOS
   DATOS QUE HAY. Un día laborable sin ningún fichaje tiene que aparecer y contar como defecto. Si
   solo se recorrieran los días con asientos, un mes con una semana sin fichar saldría con saldo
   cero en vez de con cuarenta horas de menos: el error caería a favor de quien no fichó y en contra
   de la fiabilidad del registro, que es la única cosa que esta herramienta no puede permitirse. */

const asientoEn = (fecha: string, seq: number, kind: string, hora: string) => ({
  id: idOf(seq),
  seq,
  op: 'record',
  corrects: null,
  reason: null,
  kind,
  occurred_at: `${fecha}T${hora}:00+02:00`,
  recorded_at: `${fecha}T${hora}:00+02:00`,
  work_date: fecha,
});

const rango = { schedules: [completa], absences: [], holidays: [] };

test('un rango suma las horas de sus días', () => {
  // Lunes 2026-07-06 de 9 a 17 son 480, y martes 07 de 9 a 18 son 540. Teóricos, 480 cada uno.
  const resultado = compileRange(
    [
      asientoEn('2026-07-06', 1, 'in', '09:00'),
      asientoEn('2026-07-06', 2, 'out', '17:00'),
      asientoEn('2026-07-07', 3, 'in', '09:00'),
      asientoEn('2026-07-07', 4, 'out', '18:00'),
    ],
    { ...rango, from: '2026-07-06', to: '2026-07-07' },
  );

  assert.equal(resultado.days.length, 2);
  assert.equal(resultado.workedMinutes, 1020);
  assert.equal(resultado.theoreticalMinutes, 960);
  assert.equal(resultado.balanceMinutes, 60);
});

test('un día laborable sin fichajes cuenta como defecto y no desaparece', () => {
  const resultado = compileRange(
    [asientoEn('2026-07-06', 1, 'in', '09:00'), asientoEn('2026-07-06', 2, 'out', '17:00')],
    { ...rango, from: '2026-07-06', to: '2026-07-07' },
  );

  assert.equal(resultado.days.length, 2, 'el martes sin fichajes sigue siendo un día del rango');
  assert.equal(resultado.workedMinutes, 480);
  assert.equal(resultado.theoreticalMinutes, 960);
  assert.equal(resultado.balanceMinutes, -480, 'el día sin fichar es un defecto de jornada entera');
});

test('un fin de semana sin fichajes no resta nada', () => {
  // Sábado 2026-07-11 y domingo 12: cero teóricos, así que el saldo no se mueve.
  const resultado = compileRange([], { ...rango, from: '2026-07-11', to: '2026-07-12' });

  assert.equal(resultado.days.length, 2);
  assert.equal(resultado.theoreticalMinutes, 0);
  assert.equal(resultado.balanceMinutes, 0);
});

test('un asiento fuera del rango no entra en el total', () => {
  const resultado = compileRange(
    [
      asientoEn('2026-07-06', 1, 'in', '09:00'),
      asientoEn('2026-07-06', 2, 'out', '17:00'),
      asientoEn('2026-07-08', 3, 'in', '09:00'),
      asientoEn('2026-07-08', 4, 'out', '17:00'),
    ],
    { ...rango, from: '2026-07-06', to: '2026-07-07' },
  );

  assert.equal(resultado.days.length, 2);
  assert.equal(resultado.workedMinutes, 480, 'el miércoles queda fuera del rango pedido');
});

test('una serie incoherente devuelve incidencias y no lanza', () => {
  /* La invariante que sostiene toda la herramienta. Una salida sin entrada, una pausa que cierra
     sin haber abierto y un orden imposible: nada de esto puede tumbar el visor de nadie. */
  assert.doesNotThrow(() => {
    compileDay(
      [
        asiento(1, 'out', '18:00'),
        asiento(2, 'break_end', '11:15'),
        asiento(3, 'in', '09:00'),
      ],
      opciones,
    );
  });
});

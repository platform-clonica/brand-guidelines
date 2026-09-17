/* Clock_r — las tres escrituras de administración, validadas antes de tocar la base de datos.

   Ausencias, festivos y rol. Las tres son de administración, así que la RLS ya impide que las toque
   quien no lo es; lo que la RLS NO mira es si lo que se escribe tiene sentido, y ahí es donde entra
   esto. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAbsence, buildCalendarDay, buildRolePatch, buildStatusPatch } from '../server.ts';

const PERSONA = '11111111-1111-4111-8111-111111111111';

const ok = <T extends { ok: boolean }>(r: T) => {
  assert.equal(r.ok, true, `esperaba que pasara: ${'error' in r ? String(r.error) : ''}`);
  return r as Extract<T, { ok: true }>;
};

const falla = <T extends { ok: boolean }>(r: T) => {
  assert.equal(r.ok, false, 'esperaba que lo rechazara');
  return r as Extract<T, { ok: false }>;
};

/* ─── Ausencias ─── */

test('una ausencia normal se acepta', () => {
  const r = ok(
    buildAbsence({ personId: PERSONA, fromDate: '2026-08-03', toDate: '2026-08-14', kind: 'vacaciones' }),
  );

  assert.equal(r.row.person_id, PERSONA);
  assert.equal(r.row.from_date, '2026-08-03');
  assert.equal(r.row.to_date, '2026-08-14');
  assert.equal(r.row.kind, 'vacaciones');
});

test('una ausencia de un solo día se acepta', () => {
  // Los dos extremos entran dentro, así que un día suelto es fromDate igual a toDate.
  const r = ok(
    buildAbsence({ personId: PERSONA, fromDate: '2026-08-03', toDate: '2026-08-03', kind: 'ausencia' }),
  );
  assert.equal(r.row.from_date, r.row.to_date);
});

test('una ausencia que acaba antes de empezar se rechaza', () => {
  const r = falla(
    buildAbsence({ personId: PERSONA, fromDate: '2026-08-14', toDate: '2026-08-03', kind: 'vacaciones' }),
  );
  assert.equal(r.status, 400);
});

test('un tipo de ausencia que no existe se rechaza', () => {
  /* La lista es corta a propósito: no hay tipo médico, porque el motivo de una baja es dato de
     salud y no tiene por qué vivir en una herramienta que administración consulta a diario. */
  const r = falla(
    buildAbsence({ personId: PERSONA, fromDate: '2026-08-03', toDate: '2026-08-14', kind: 'baja_medica' }),
  );
  assert.equal(r.status, 400);
});

test('una ausencia sin persona se rechaza', () => {
  assert.equal(
    falla(buildAbsence({ fromDate: '2026-08-03', toDate: '2026-08-14', kind: 'vacaciones' })).status,
    400,
  );
});

test('una nota en blanco se guarda como nula, no como cadena vacía', () => {
  const r = ok(
    buildAbsence({
      personId: PERSONA, fromDate: '2026-08-03', toDate: '2026-08-14', kind: 'ausencia', note: '   ',
    }),
  );
  assert.equal(r.row.note, null);
});

/* ─── Festivos ─── */

test('un festivo normal se acepta', () => {
  const r = ok(buildCalendarDay({ day: '2026-10-12', name: 'Fiesta Nacional', scope: 'nacional' }));

  assert.equal(r.row.day, '2026-10-12');
  assert.equal(r.row.name, 'Fiesta Nacional');
  assert.equal(r.row.scope, 'nacional');
});

test('un ámbito que no existe se rechaza', () => {
  // Los identificadores van en ASCII y en minúscula (`cataluna`); la etiqueta bonita es de la interfaz.
  assert.equal(
    falla(buildCalendarDay({ day: '2026-09-11', name: 'Diada', scope: 'Cataluña' })).status,
    400,
  );
});

test('un festivo sin nombre se rechaza', () => {
  assert.equal(falla(buildCalendarDay({ day: '2026-10-12', name: '   ', scope: 'nacional' })).status, 400);
});

/* ─── El rol ─── */

test('subir a alguien a administración se acepta', () => {
  const r = ok(buildRolePatch({ role: 'admin' }, { adminsActivos: 2, eraAdmin: false }));
  assert.equal(r.role, 'admin');
});

test('bajar a un administrador cuando quedan otros se acepta', () => {
  const r = ok(buildRolePatch({ role: 'member' }, { adminsActivos: 2, eraAdmin: true }));
  assert.equal(r.role, 'member');
});

test('quitar el último administrador se rechaza', () => {
  /* Sin ningún administrador, NADIE puede volver a nombrar uno desde la aplicación: la política de
     escritura sobre clock_people exige ser admin, así que haría falta entrar a mano en el SQL
     Editor. Es un choque con el estado actual y no una petición malformada, de ahí el 409. */
  const r = falla(buildRolePatch({ role: 'member' }, { adminsActivos: 1, eraAdmin: true }));
  assert.equal(r.status, 409);
});

test('un rol que no existe se rechaza', () => {
  assert.equal(falla(buildRolePatch({ role: 'jefe' }, { adminsActivos: 2, eraAdmin: false })).status, 400);
});

/* ─── La baja de una persona ───

   Tiene EXACTAMENTE el mismo agujero que degradar a alguien, y por eso se escribe aparte en vez de
   dejarlo a la intuición de quien escriba el handler: desactivar al último administrador deja el
   equipo sin ninguno, y sin ninguno nadie puede volver a nombrar uno desde la aplicación.

   Dar de baja no borra nada. La persona pasa a `inactive` y su registro sigue entero y exportable:
   el asiento guarda copia de su nombre y su correo, así que sobrevive incluso a que se borre su
   cuenta de Google. */

/* El campo de salida se llama `nextStatus` y no `status` a propósito: en el tipo `Fail`, `status` ya
   es el código HTTP, así que un éxito con `status: 'inactive'` y un fallo con `status: 409`
   compartirían nombre para dos cosas que no tienen nada que ver. */

test('dar de baja a alguien que no es administrador se acepta', () => {
  const r = ok(buildStatusPatch({ status: 'inactive' }, { adminsActivos: 2, eraAdmin: false }));
  assert.equal(r.nextStatus, 'inactive');
});

test('dar de baja a un administrador cuando quedan otros se acepta', () => {
  const r = ok(buildStatusPatch({ status: 'inactive' }, { adminsActivos: 2, eraAdmin: true }));
  assert.equal(r.nextStatus, 'inactive');
});

test('dar de baja al último administrador se rechaza', () => {
  const r = falla(buildStatusPatch({ status: 'inactive' }, { adminsActivos: 1, eraAdmin: true }));
  assert.equal(r.status, 409);
});

test('volver a dar de alta al último administrador se acepta', () => {
  // Reactivar nunca deja al equipo sin administradores: la guarda solo mira hacia la baja.
  const r = ok(buildStatusPatch({ status: 'active' }, { adminsActivos: 1, eraAdmin: true }));
  assert.equal(r.nextStatus, 'active');
});

test('un estado que no existe se rechaza', () => {
  assert.equal(
    falla(buildStatusPatch({ status: 'excedencia' }, { adminsActivos: 2, eraAdmin: false })).status,
    400,
  );
});

-- Clock_r: jornada por defecto al darse de alta. Corrige 20260917140000_create_clock.sql.
--
-- ADITIVA. Cambia un valor por defecto y rellena las filas que se hubieran quedado sin jornada.
-- No toca permisos, ni políticas, ni ninguna otra tabla.
--
-- QUÉ FALTABA. La definición pide alta automática «con jornada por defecto al primer acceso»
-- (docs/features/clock-r.md), con el argumento de que la herramienta existe para quitar fricción.
-- La migración anterior dejaba `schedules` en `[]`, así que quien entrara por primera vez nacía
-- SIN jornada teórica: `compileDay` no tendría contra qué calcular el saldo y todos sus días
-- saldrían marcados como incidencia hasta que administración le pusiera el horario a mano. Justo
-- la fricción que se venía a quitar.
--
-- LA FORMA DEL TRAMO. `schedules` es un array de tramos con `validFrom`, para que el saldo de un
-- día pasado se calcule con la jornada vigente ESE día y no con la actual. Las claves van en
-- camelCase porque es lo que hace el repo dentro de las columnas JSONB (ver lib/ds/schema.ts); el
-- snake_case se queda para los nombres de columna.
--
-- Los minutos, y no las horas, para no meter decimales en un cálculo que acaba en un saldo legal.
-- 480 = 8 h. `validFrom` en 2000-01-01 a propósito: el tramo por defecto cubre cualquier fecha, así
-- que nadie se queda sin jornada teórica por haber fichado antes de su propia alta.
--
-- 40 h de lunes a viernes es EL SUPUESTO, no una norma comprobada: es la jornada ordinaria máxima
-- del Estatuto de los Trabajadores. La real de cada persona la pone Personas desde el panel, y la
-- de quien tenga otra cosa hay que ajustarla al darla de alta.

begin;

alter table public.clock_people
  alter column schedules
  set default '[{"validFrom": "2000-01-01", "weekly": {"mon": 480, "tue": 480, "wed": 480, "thu": 480, "fri": 480, "sat": 0, "sun": 0}}]'::jsonb;

-- Las que ya existan sin ningún tramo. Hoy no hay ninguna —la tabla se creó esta mañana— pero la
-- migración tiene que poder aplicarse igual dentro de un mes.
update public.clock_people
   set schedules = '[{"validFrom": "2000-01-01", "weekly": {"mon": 480, "tue": 480, "wed": 480, "thu": 480, "fri": 480, "sat": 0, "sun": 0}}]'::jsonb
 where schedules is null
    or jsonb_typeof(schedules) <> 'array'
    or jsonb_array_length(schedules) = 0;

commit;

-- ── Comprobación posterior ──────────────────────────────────────────────────────────────────
--   select column_default from information_schema.columns
--    where table_schema = 'public' and table_name = 'clock_people' and column_name = 'schedules';
--   → el array con el tramo de 2000-01-01
--
--   select count(*) from public.clock_people where jsonb_array_length(schedules) = 0;
--   → 0

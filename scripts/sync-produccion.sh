#!/usr/bin/env bash
# Al abrir sesión: dejar el local igual que `produccion` (el repo del equipo, el que despliega
# Netlify). Regla de Alberto: lo que hay en local debe ser exactamente lo último subido a
# producción, para poder seguir desde cualquiera de sus dos Macs.
#
# Se engancha como hook SessionStart (ver .claude/settings.json). Emite JSON en stdout:
#   .systemMessage                       → lo ve Alberto en la UI
#   .hookSpecificOutput.additionalContext → lo ve el modelo
#
# NUNCA toca el árbol de trabajo si hay algo que perder. Solo avanza cuando el fast-forward es
# trivial; en cualquier otro caso informa y se aparta. Sale 0 siempre: un fallo de red al arrancar
# no debe romper la sesión.

set -uo pipefail

emit() { # $1 = mensaje
  jq -n --arg m "$1" \
    '{systemMessage:$m, hookSpecificOutput:{hookEventName:"SessionStart", additionalContext:$m}}'
  exit 0
}

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

# Sin remoto `produccion` esto no aplica (p. ej. un clon de otra persona): salir en silencio.
git remote get-url produccion >/dev/null 2>&1 || exit 0

if ! git fetch produccion --quiet 2>/dev/null; then
  emit "git: no se pudo contactar con \`produccion\` (¿sin red?). Local sin verificar contra producción."
fi

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
local_sha=$(git rev-parse HEAD 2>/dev/null)
remote_sha=$(git rev-parse produccion/main 2>/dev/null) || exit 0

[ "$local_sha" = "$remote_sha" ] && exit 0   # ya coincide: no molestar

behind=$(git rev-list --count "HEAD..produccion/main" 2>/dev/null || echo 0)
ahead=$(git rev-list --count "produccion/main..HEAD" 2>/dev/null || echo 0)

if [ "$branch" != "main" ]; then
  emit "git: estás en \`$branch\`, no en main — no toco nada. produccion/main va $behind commit(s) por delante."
fi

if [ "$ahead" -gt 0 ] && [ "$behind" -gt 0 ]; then
  emit "git: main y produccion/main han DIVERGIDO ($ahead tuyos / $behind del equipo). No hago pull — hay que integrarlo a mano."
fi

if [ "$ahead" -gt 0 ]; then
  emit "git: tienes $ahead commit(s) en local sin subir a produccion. Nada nuevo del equipo que traer."
fi

# Solo queda el caso limpio: produccion va por delante y local no tiene nada propio.
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  emit "git: produccion/main va $behind commit(s) por delante, pero hay cambios sin commitear — NO he hecho pull para no pisarlos."
fi

if git merge --ff-only produccion/main --quiet 2>/dev/null; then
  emit "git: traídos $behind commit(s) nuevos de produccion. Local == producción ($(git rev-parse --short HEAD))."
fi

emit "git: produccion/main va $behind commit(s) por delante pero el fast-forward ha fallado. Revísalo a mano."

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

/* El repo llevaba `eslint` y `eslint-config-next` en devDependencies, el README anunciaba
   `npm run lint` como comprobación de salud, y el comando NO funcionaba: sin ningún fichero de
   configuración, `next lint` entra en su asistente interactivo y se queda esperando una respuesta
   — en CI se colgaría. O sea que el proyecto no tenía linter.

   Config plana (`eslint.config.mjs`) y no `.eslintrc`, porque `next lint` desaparece en Next 16 y
   el script pasa a invocar `eslint` directamente. */

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**',
      'audit/**',
      'supabase/**',
      'next-env.d.ts',
      'deck-prototype.html',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      /* Arranca en modo aviso a propósito. El objetivo de esta entrega es que el linter EXISTA y
         corra en CI, no meter 200 errores nuevos entre el equipo y su siguiente despliegue.
         Subir estas tres a `error` es una tarea propia, cuando el ruido esté a cero. */
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    /* Los tests usan `any` a discreción para forzar entradas malformadas contra el compilador de
       decks — es su trabajo, y por eso los 40 `any` del repo están casi todos aquí. */
    files: ['**/__tests__/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
];

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import react from 'eslint-plugin-react'

// Deliberately narrow. Three runtime errors in this codebase got past a
// green `vite build`, because esbuild transpiles without resolving
// identifiers or understanding React's rules:
//
//   - useState called after an early return in HomePage's ActivityDetail
//   - a stale `visible.length` left behind by a refactor in TeamGoals
//
// The two rules that would have caught those are errors. Everything else is
// a warning, so `npm run lint` stays usable on a codebase that has never
// been linted rather than drowning in style noise.

export default [
  { ignores: ['dist/**', 'node_modules/**', 'supabase/**', '{src/**'] },

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      react,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Without this, anything referenced only from JSX reads as unused —
      // `motion` in PageTransition was being reported despite <motion.div>.
      'react/jsx-uses-vars': 'error',

      // The two that matter.
      'no-undef': 'error',
      'react-hooks/rules-of-hooks': 'error',

      // Real, but not worth failing a lint run over on day one.
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', {
        // Components and constants read as unused to the base rule when they
        // are only referenced from JSX in another file.
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  // Edge Functions run on Deno, not in a browser.
  {
    files: ['supabase/functions/**/*.ts'],
    languageOptions: { globals: { ...globals.deno } },
  },
]

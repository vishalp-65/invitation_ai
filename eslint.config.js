import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**', '**/.turbo/**', 'packages/db/drizzle/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}', 'packages/templates/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-html-link-for-pages': 'off', // App Router only
    },
  },
  {
    // Code that can end up in the browser bundle must never pull in server-only packages: they
    // carry DB/storage/AI clients and secrets. Server-side web code goes through the API instead.
    files: ['apps/web/**/*.{ts,tsx}', 'packages/shared/**/*.ts', 'packages/templates/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@cardai/db', '@cardai/db/*', '@cardai/ai', '@cardai/ai/*', '@cardai/infra', '@cardai/infra/*'],
              message: 'Server-only package: browser-reachable code must call the API instead.',
            },
            {
              group: ['pg', 'ioredis', 'drizzle-orm', 'drizzle-orm/*', '@aws-sdk/*'],
              message: 'Server-only dependency: not allowed in web/shared/templates.',
            },
          ],
        },
      ],
    },
  },
  {
    // shared and templates also run in the browser, so no Node built-ins either.
    files: ['packages/shared/**/*.ts', 'packages/templates/**/*.{ts,tsx}'],
    ignores: ['**/*.test.ts', '**/*.test.tsx', '**/scripts/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@cardai/db', '@cardai/db/*', '@cardai/ai', '@cardai/ai/*', '@cardai/infra', '@cardai/infra/*', 'pg', 'ioredis', 'drizzle-orm', 'drizzle-orm/*', '@aws-sdk/*'], message: 'Server-only package: not allowed in browser-shared packages.' },
            { group: ['node:*', 'fs', 'fs/*', 'path', 'crypto', 'child_process', 'os', 'stream'], message: 'Node built-in: shared and templates also run in the browser.' },
          ],
        },
      ],
    },
  },
);

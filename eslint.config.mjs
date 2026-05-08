import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

const eslintConfig = [
  {
    ignores: [
      '**/.next/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/next-env.d.ts'
    ]
  },
  {
    settings: {
      next: {
        rootDir: ['apps/web/', 'apps/crm/']
      }
    }
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off'
    }
  }
];

export default eslintConfig;

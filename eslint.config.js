import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.system_generated/**',
      'public/**',
      '*.config.js',
      '*.config.ts',
    ],
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
    rules: {
      // Allow runes like $state, $props, $derived without warnings
      'no-undef': 'off',
    },
  }
);

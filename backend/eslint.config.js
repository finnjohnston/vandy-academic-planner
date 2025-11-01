const eslint = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // Files to lint
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettier,
    },
    rules: {
      // TypeScript recommended rules
      ...tseslint.configs.recommended.rules,

      // Prettier integration
      'prettier/prettier': 'error',

      // Custom rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': 'off', // Allow console in backend
      'no-undef': 'off', // TypeScript handles this
    },
  },

  // Disable rules that conflict with Prettier
  prettierConfig,

  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '*.js', // Ignore any JS files in root (like this config)
      'coverage/**',
      '.env',
      'prisma/migrations/**',
    ],
  },
];

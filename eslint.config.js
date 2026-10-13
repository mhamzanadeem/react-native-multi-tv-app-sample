// Lint tooling is owned by the Expo workspace under workspace-limited hoisting.
const { createRequire } = require('node:module');
const requireExpo = createRequire(require('node:path').join(__dirname, 'apps/expo-multi-tv/package.json'));
const prettier = requireExpo('eslint-plugin-prettier');

module.exports = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['node_modules/**', 'build/**', 'dist/**'],
    languageOptions: {
      parser: requireExpo('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': requireExpo('@typescript-eslint/eslint-plugin'),
      react: requireExpo('eslint-plugin-react'),
      prettier: prettier,
    },
    rules: {
      semi: ['warn', 'always'],
      'prefer-const': 'error',
      'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prettier/prettier': [
        'warn',
        {
          endOfLine: 'auto',
          usePrettierrc: true,
        },
      ],
    },
  },
];

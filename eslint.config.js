//@ts-check
import eslint from '@eslint/js';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    ignores: ['.nuxt/**', 'node_modules/**', '.output/**', 'dist/**'],
  },
  {
    files: ['*.vue', '**/*.vue', '**/*.ts', '**/*.js'],
    plugins: {
      prettier: eslintPluginPrettier,
    },
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        MouseEvent: 'readonly',
        Event: 'readonly',
        HTMLElement: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      ...eslintConfigPrettier.rules,
      'vue/multi-word-component-names': 'off',
      // Nuxt auto-imports are available at runtime
      'no-undef': 'off',
      '@typescript-eslint/no-undef': 'off',
    },
  },
  // Disallow console.log in production code paths
  // Exclude logger files since they're logging utilities
  {
    files: [
      'server/**/*.ts',
      'server/**/*.js',
      'composables/**/*.ts',
      'services/**/*.ts',
      'utils/**/*.ts',
    ],
    ignores: ['**/logger.ts', '**/useLogger.ts'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  // Allow console in logger utilities (they're logging utilities by design)
  {
    files: ['**/logger.ts', '**/useLogger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  // Allow console.log in pages and scripts (for temporary debugging)
  {
    files: [
      'pages/**/*.vue',
      'pages/**/*.ts',
      'scripts/**/*.ts',
      'scripts/**/*.js',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  eslintConfigPrettier
);

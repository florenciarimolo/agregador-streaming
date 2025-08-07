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
    },
  },
  eslintConfigPrettier
);

import globals from 'globals';
import pluginJs from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      '*.min.js',
      'coverage/',
      'api/flowise-webhook/sendContacts.js',
      'eslint.config.js',
    ],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
    },
  },
  pluginJs.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['website/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        $: 'readonly',
        jQuery: 'readonly',
        gsap: 'readonly',
        ScrollTrigger: 'readonly',
        Lenis: 'readonly',
        Swiper: 'readonly',
        SplitType: 'readonly',
        AirDatepicker: 'readonly',
        ym: 'readonly',
        Chatbot: 'readonly',
      },
    },
  },
  {
    files: ['local/cloudflare/**/*.js'],
    languageOptions: {
      sourceType: 'module',
    },
  },
];

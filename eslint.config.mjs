import noUnsanitized from 'eslint-plugin-no-unsanitized';

export default [
  {
    plugins: { 'no-unsanitized': noUnsanitized },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        chrome: 'readonly',
        window: 'readonly',
        document: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        Promise: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        clearTimeout: 'readonly',
        MutationObserver: 'readonly',
        Event: 'readonly',
        fetch: 'readonly',
        module: 'readonly',
        // funções globais dos content scripts injetados antes
        extractProjectData: 'readonly',
        applyAttributeConfig: 'readonly',
        // globals do popup
        loadProtocols: 'readonly',
        saveProtocols: 'readonly',
        addToList: 'readonly',
        removeFromList: 'readonly',
      },
    },
    rules: {
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'eqeqeq': ['error', 'always'],
    },
  },
  {
    // Testes e scripts de geração usam Node/CommonJS
    files: ['tests/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        jest: 'readonly',
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        MutationObserver: 'readonly',
        Promise: 'readonly',
        document: 'readonly',
      },
    },
  },
];

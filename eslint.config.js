export default [
  {
    ignores: [
      'dist/**',
      'dist-crm/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'vendor/**'
    ]
  },
  {
    files: ['apps/**/*.js', 'worker/**/*.js', 'scripts/**/*.mjs', 'src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-unreachable': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-duplicate-imports': 'error'
    }
  }
];

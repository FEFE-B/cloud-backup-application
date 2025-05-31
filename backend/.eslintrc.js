module.exports = {
  env: {
    node: true,
    es6: true,
    jest: true,
  },
  extends: ['airbnb-base', 'plugin:jest/recommended'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['jest'],
  rules: {
    // Custom rules for the project
    'no-underscore-dangle': 'off', // Allow _id for MongoDB
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',
    'comma-dangle': ['error', 'only-multiline'],
    'linebreak-style': 'off',
    'max-len': ['error', { code: 120 }],
  },
  overrides: [
    {
      files: ['tests/**/*.test.js'],
      rules: {
        'no-unused-expressions': 'off', // Allow chai assertions
      },
    },
  ],
};

module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    // Turn off to allow TS private in constructor
    'no-useless-constructor': 'off',
    // Turn off to allow TS overloading
    'no-dupe-class-members': 'off',
    // Allow any type for flexibility in voice responses
    '@typescript-eslint/no-explicit-any': 'off',
    // Allow unused vars with underscore prefix
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
  },
};

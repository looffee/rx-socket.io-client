module.exports = {
  extends: ['./../.eslintrc.js'],
  plugins: ['eslint-plugin-jest'],
  rules: {
    '@typescript-eslint/no-var-requires': 'off',
  },
  env: {
    'jest/globals': true,
  },
};

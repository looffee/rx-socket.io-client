module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./**/tsconfig.json'],
  },
  extends: [
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'airbnb-typescript/base',
  ],
  rules: {
    'import/prefer-default-export': 'off',
    'lines-between-class-members': 'off',
    'operator-linebreak': ['error', 'after'],
    'no-console': 'off',
    'no-param-reassign': ['error', { 'props': false }],
  },
};

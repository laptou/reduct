module.exports = {
  root: true,
  extends: [
    '../.eslintrc.js',
  ],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
  ],
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': [ '.ts', '.tsx' ]
    }
  }
};

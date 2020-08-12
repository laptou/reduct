module.exports = {
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
};

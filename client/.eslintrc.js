const { resolve } = require('path');

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    'react'
  ],
  extends: [
    '../.eslintrc.js',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  rules: {
    // jsx rules
    'react/jsx-first-prop-new-line': ['error'],
    'react/jsx-indent': ['error', 2, { checkAttributes: true, indentLogicalExpressions: true }],
    'react/jsx-indent-props': ['error', 2],
    'react/jsx-closing-tag-location': ['error'],
    'react/jsx-closing-bracket-location': ['error', 'line-aligned'],
    'react/jsx-curly-spacing': ['error'],
    'react/jsx-curly-newline': ['error', 'consistent'],
    'react/jsx-tag-spacing': [
      'error', 
      {
        'closingSlash': 'never',
        'beforeSelfClosing': 'always',
        'afterOpening': 'never',
        'beforeClosing': 'allow'
      }
    ],
    'react/jsx-wrap-multilines': [
      'error',
      {
        'declaration': 'parens-new-line',
        'assignment': 'parens-new-line',
        'return': 'parens-new-line',
        'arrow': 'parens-new-line',
        'condition': 'ignore',
        'logical': 'ignore',
        'prop': 'ignore'
      }
    ],
    'react/button-has-type': ['warn'],
    'react/boolean-prop-naming': ['warn'],
    'react/jsx-key': ['error'],
    'react/jsx-no-useless-fragment': ['warn'],
    'react/no-access-state-in-setstate': ['warn'],
    'react/no-children-prop': ['warn'],
    'react/jsx-pascal-case': ['error'],
    'react/prop-types': ['off'],
  },
  ignorePatterns: [
    'node_modules/',
    'chapterutil/',
    'dist/',
    'resources/',
  ],
  settings: {
    'import/resolver': {
      'eslint-import-resolver-webpack': {
        config: resolve(__dirname, 'webpack.config.js'),
        env: {
          development: true
        }
      }
    },
    'react': {
      version: 'detect'
    }
  }
};

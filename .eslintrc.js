const { resolve } = require('path');

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  env: {
    browser: true
  },
  plugins: [
    '@typescript-eslint',
    'react'
  ],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
    sourceType: 'module',
    extraFileExtensions: ['.mjs'],
    ecmaFeatures: {
      jsx: true
    }
  },
  extends: [
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': [
      'off'
    ],
    '@typescript-eslint/no-var-requires': [
      'off'
    ],
    '@typescript-eslint/no-non-null-assertion': [
      'off'
    ],
    '@typescript-eslint/no-explicit-any': [
      'off'
    ],
    '@typescript-eslint/member-ordering': [
      'error',
      {
        default: [
          // Index signature
          'signature',
          // Static
          'private-static-field',
          'protected-static-field',
          'public-static-field',
          'private-static-method',
          'protected-static-method',
          'public-static-method',
          'private-instance-field',
          'protected-instance-field',
          'public-instance-field',
          // Constructors
          'private-constructor',
          'protected-constructor',
          'public-constructor',
          // Methods
          'private-instance-method',
          'protected-instance-method',
          'public-instance-method',
          // Abstract
          'private-abstract-field',
          'protected-abstract-field',
          'public-abstract-field',
          'private-abstract-method',
          'protected-abstract-method',
          'public-abstract-method'
        ]
      }
    ],
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      {
        accessibility: 'explicit'
      }
    ],
    '@typescript-eslint/prefer-readonly': ['warn'],
    '@typescript-eslint/unbound-method': ['warn'],
    '@typescript-eslint/no-unused-expressions': ['warn'],
    
    'no-continue': 'off',
    'no-restricted-syntax': 'off',
    'space-before-function-paren': 'off',
    'no-use-before-define': 'warn',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-unused-expressions': 'off', // replaced by typescript-eslint variant
    'func-names': 'off',
    'no-plusplus': 'off',
    'no-param-reassign': 'off',
    'no-console': 'off',
    'no-underscore-dangle': 'off',
    
    // semantic rules
    'accessor-pairs': ['error'],
    'grouped-accessor-pairs': ['error', 'getBeforeSet'],
    'yoda': ['error', 'never', { exceptRange: true }],
    'no-unneeded-ternary': ['error'],
    'no-var': ['error'],
    'no-useless-computed-key': ['error'],
    'prefer-const': ['error', { destructuring: 'all' }],
    'constructor-super': ['warn'],
    
    // spacing rules
    'dot-location': ['warn', 'property'],
    'block-spacing': ['error', 'always'],
    'key-spacing': ['error'],
    'semi-spacing': ['error', { before: false, after: true }],
    'comma-spacing': ['error', { before: false, after: true }],
    'keyword-spacing': ['error', { before: true, after: true }],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'computed-property-spacing': ['error', 'never'],
    'space-in-parens': ['error', 'never'],
    'space-before-blocks': ['error', 'always'],
    'no-whitespace-before-property': ['error'],
    'func-call-spacing': ['error', 'never'],
    'generator-star-spacing': ['error', 'both'],
    'yield-star-spacing': ['error', 'both'],
    'indent': [
      'error',
      2,
      {
        ignoredNodes: [
          'TemplateLiteral'
        ]
      }
    ],
    
    // newline rules
    'object-curly-newline': ['error', { multiline: true, minProperties: 4, consistent: true }],
    'object-property-newline': ['error'],
    'array-bracket-newline': ['error', { multiline: true, minItems: 4 }],
    'function-call-argument-newline': ['error', 'consistent'],
    'lines-between-class-members': ['error', 'always'],
    'operator-linebreak': ['error', 'before', { overrides: { '=': 'after' } }],
    
    // comma rules
    'comma-dangle': [
      'error',
      'always-multiline',
      {
        functions: 'never'
      }
    ],
    'comma-spacing': ['error', { before: false, after: true }],
    'semi': ['error', 'always'],
    'no-extra-semi': ['error'],

    // braces
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    
    // quote rules
    'quote-props': ['error', 'consistent-as-needed'],
    'quotes': ['error', 'single'],
    
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
    
    'import/extensions': ['warn', 'never'],
    'import/prefer-default-export': ['off'],
    'import/first': ['warn'],
    'import/exports-last': ['warn'],
    'import/no-duplicates': ['warn'],
    'import/order': ['error', { 'newlines-between': 'always' }],
    'import/newline-after-import': ['warn'],
    'max-classes-per-file': ['warn', 2]
  },
  ignorePatterns: [
    'node_modules/',
    'chapterutil/',
    'dist/',
    'resources/',
    'docs/'
  ],
  settings: {
    'import/resolver': {
      webpack: {
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
}

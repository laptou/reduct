module.exports = {
    "root": true,
    "parser": "@typescript-eslint/parser",
    "env": {
        "browser": true
    },
    "plugins": [
        "@typescript-eslint"
    ],
    "parserOptions": {
        tsconfigRootDir: __dirname,
        "project": ["./tsconfig.json"],
        "sourceType": "module"
    },
    "extends": [
        "airbnb-base",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:import/errors",
        "plugin:import/warnings",
        "plugin:import/typescript",
    ],
    "rules": {
        "@typescript-eslint/explicit-function-return-type": [
            "off"
        ],
        "@typescript-eslint/no-var-requires": [
            "off"
        ],
        "@typescript-eslint/no-non-null-assertion": [
            "off"
        ],
        "@typescript-eslint/no-explicit-any": [
            "off"
        ],
        "@typescript-eslint/member-ordering": [
            "error",
            {
                "default": [
                    // Index signature
                    "signature",
                    // Static
                    "private-static-field",
                    "protected-static-field",
                    "public-static-field",
                    "private-static-method",
                    "protected-static-method",
                    "public-static-method",
                    "private-instance-field",
                    "protected-instance-field",
                    "public-instance-field",
                    // Constructors
                    "private-constructor",
                    "protected-constructor",
                    "public-constructor",
                    // Methods
                    "private-instance-method",
                    "protected-instance-method",
                    "public-instance-method",
                    // Abstract
                    "private-abstract-field",
                    "protected-abstract-field",
                    "public-abstract-field",
                    "private-abstract-method",
                    "protected-abstract-method",
                    "public-abstract-method"
                ]
            }
        ],
        "@typescript-eslint/explicit-member-accessibility": [
            "error",
            {
                "accessibility": "explicit"
            }
        ],
        "@typescript-eslint/prefer-readonly": [
            "warn"
        ],
        "@typescript-eslint/unbound-method": [
            "warn"
        ],
        "indent": [
            "error",
            4,
            {
                "ignoredNodes": [
                    "TemplateLiteral"
                ]
            }
        ],
        "quotes": [
            "error",
            "double"
        ],
        "no-continue": "off",
        "no-restricted-syntax": "off",
        "brace-style": [
            "error",
            "stroustrup"
        ],
        "array-bracket-spacing": "off",
        "comma-dangle": [
            "error",
            "always-multiline",
            {
                "functions": "never"
            }
        ],
        "space-before-function-paren": "off",
        "no-use-before-define": "off",
        "no-unused-vars": [
            "warn",
            {
                "argsIgnorePattern": "^_"
            }
        ],
        "func-names": "off",
        "no-plusplus": "off",
        "no-param-reassign": "off",
        "no-console": "off",
        "no-underscore-dangle": "off",
        "quote-props": [
            "error",
            "consistent"
        ],
        // semantic rules
        'accessor-pairs': ['error'],
        'grouped-accessor-pairs': ['error', 'getBeforeSet'],
        'yoda': ['error', 'never', { exceptRange: true }],
        'no-unneeded-ternary': ['error'],
        'no-var': ['error'],
        'no-useless-computed-key': ['error'],
        'prefer-const': ['error', { destructuring: 'all' }],
    
        // spacing rules
        'dot-location': ['warn', 'property'],
        'block-spacing': ['error', 'always'],
        'key-spacing': ['error'],
        'keyword-spacing': ['error', { before: true, after: true }],
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'never'],
        'computed-property-spacing': ['error', 'never'],
        'space-in-parens': ['error', 'never'],
        'space-before-blocks': ['error', 'always'],
        'no-whitespace-before-property': ['error'],
        'func-call-spacing': ['error', 'never'],
        'generator-star-spacing': ['error', 'after'],
        'yield-star-spacing': ['error', 'after'],

        // newline rules
        'object-curly-newline': ['error', { multiline: true, minProperties: 4, consistent: true }],
        'object-property-newline': ['error',{ allowAllPropertiesOnSameLine: true }],
    
        // comma rules
        'comma-dangle': ['error', 'never'],
        'comma-spacing': ['error', { before: false, after: true }],
        'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    
        // quote rules
        'quote-props': ['error', 'consistent-as-needed'],
        'quotes': ['error', 'single'],
        
        'import/extensions': ['warn', 'never']
    },
    "ignorePatterns": [
        "node_modules/",
        "chapterutil/",
        "dist/",
        "resources/",
        "docs/"
    ]
}
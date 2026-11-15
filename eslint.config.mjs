import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['out/', 'dist/', 'dist-web/', 'release/', 'coverage/'] },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['*.mjs'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration[const=true]',
          message: 'Use a regular string enum, not a const enum.',
        },
        {
          selector: 'TSEnumMember > Literal[raw=/^[0-9]/]',
          message: 'Enums must use string values.',
        },
      ],
    },
  },

  // Renderer (browser + React)
  {
    files: ['src/renderer/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['src/renderer/**/*.tsx'],
    ...reactRefresh.configs.vite,
  },

  // Electron main/preload and tooling (Node)
  {
    files: [
      'src/main/**/*.ts',
      'src/preload/**/*.ts',
      'scripts/**/*.mjs',
      '*.config.{ts,mts,mjs}',
      'vite.shared.mts',
    ],
    languageOptions: { globals: globals.node },
  },

  // Numeric kernels index arrays whose bounds hold by construction (loops over their own length);
  // noUncheckedIndexedAccess stays on, the assertions mark those spots explicitly.
  {
    files: ['src/renderer/src/lib/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },

  // Tests index fixtures they just built; a wrong assumption fails the test anyway.
  {
    files: ['**/*.test.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },

  // Plain JS files (configs, tooling) are not type-checked
  { files: ['**/*.{mjs,cjs}'], ...tseslint.configs.disableTypeChecked },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
)

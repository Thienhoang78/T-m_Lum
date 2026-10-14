import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import nextPlugin from '@next/eslint-plugin-next'
import prettier from 'eslint-config-prettier'

const reactRules = {
  ...react.configs.recommended.rules,
  ...react.configs['jsx-runtime'].rules,
  ...reactHooks.configs.recommended.rules,
  'react/prop-types': 'off',
  'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z_]' }],
}

export default [
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/.next',
      '**/next-env.d.ts',
      'frontend/public/ort',
      'frontend/public/mediapipe',
    ],
  },
  js.configs.recommended,

  // Frontend React (Vite)
  {
    files: ['frontend/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: '18.3' } },
    plugins: { react, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactRules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Backend Next.js + MongoDB
  {
    files: ['backend/**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: '18.3' } },
    plugins: { react, 'react-hooks': reactHooks, '@next/next': nextPlugin },
    rules: {
      ...reactRules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-html-link-for-pages': 'off', // dự án dùng App Router
    },
  },

  // File cấu hình ở thư mục gốc
  { files: ['*.{js,mjs}', 'frontend/scripts/**/*.mjs'], languageOptions: { globals: globals.node } },

  prettier,
]

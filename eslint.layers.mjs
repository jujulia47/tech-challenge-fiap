import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

// Which layer may import what. Only the native no-restricted-imports rule: docs/conventions.md
const REACT_AND_NEXT = ['react', 'react/*', 'react-dom', 'react-dom/*', 'next', 'next/*', 'next-auth', 'next-auth/*']

// A regex, not a group: in a group, '@bytebank/bff' shuts the whole folder, and
// '!@bytebank/bff/client' cannot open it again
const BROWSER_FORBIDDEN = '^@bytebank/(infrastructure|bff)(/(?!client$).*)?$'

export const LAYER_RULES = {
  core: [
    {
      group: [...REACT_AND_NEXT, '@supabase/*', 'json-server', 'nodemailer'],
      message: 'core is the domain: no framework, database or email library. Define a port and implement it in infrastructure.',
    },
    {
      // Its own testing subpath is the only package it may import
      group: ['@bytebank/*', '!@bytebank/core', '!@bytebank/core/*'],
      message: 'core depends on no other package: the other packages depend on it.',
    },
  ],
  infrastructure: [
    {
      group: REACT_AND_NEXT,
      message: 'infrastructure implements the ports of core for Node: no React and no Next.',
    },
    {
      group: ['@bytebank/bff', '@bytebank/bff/*', '@bytebank/store', '@bytebank/store/*', '@bytebank/auth', '@bytebank/auth/*', '@bytebank/design-system', '@bytebank/design-system/*'],
      message: 'infrastructure sits under bff, store, auth and design-system: it may only depend on core.',
    },
  ],
  bff: [
    {
      group: ['react', 'react/*', 'react-dom', 'react-dom/*', 'next', 'next/*'],
      message: 'bff has no framework: its handlers take a Request and give a Response, so any server can run them.',
    },
  ],
  store: [
    {
      // Everything of infrastructure and bff, except @bytebank/bff/client
      regex: BROWSER_FORBIDDEN,
      message: 'store runs in the browser: it talks to the bff over HTTP, through @bytebank/bff/client, never to its server code.',
    },
  ],
  'design-system': [
    {
      regex: BROWSER_FORBIDDEN,
      message: 'design-system runs in the browser: it talks to the bff over HTTP, through @bytebank/bff/client, never to its server code.',
    },
  ],
}

function restrictions(layer) {
  const patterns = LAYER_RULES[layer]
  return patterns ? { 'no-restricted-imports': ['error', { patterns }] } : {}
}

// The config of one package, run from its own folder by `npm run lint`
export function packageLintConfig(layer) {
  return defineConfig([
    globalIgnores(['**/node_modules/**', '**/dist/**']),
    {
      files: ['**/*.{ts,tsx}'],
      extends: [tseslint.configs.recommended, reactHooks.configs.flat.recommended],
      rules: restrictions(layer),
    },
  ])
}

// The same rules, for a run from the root of the repository
export function rootLayerRules() {
  return Object.keys(LAYER_RULES).map(layer => ({
    files: [`packages/${layer}/**/*.{ts,tsx}`],
    rules: restrictions(layer),
  }))
}

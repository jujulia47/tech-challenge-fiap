import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import { rootLayerRules } from './eslint.layers.mjs'

// Lint config for a run from the root. Each package has its own eslint.config.mjs, built from
// eslint.layers.mjs, which `npm run lint` uses; the apps keep theirs. ESLint 9 uses the config
// closest to the working directory, so `eslint` run inside apps/shell never reaches this file.
export default defineConfig([
  globalIgnores(['apps/**', '**/node_modules/**', '**/.next/**', '**/dist/**']),
  {
    files: ['packages/**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended, reactHooks.configs.flat.recommended],
  },
  ...rootLayerRules(),
])

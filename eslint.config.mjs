import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

// Shared lint config for packages/*. Apps keep their own eslint.config.mjs:
// ESLint 9 uses the config closest to the working directory, so `eslint`
// run inside apps/shell never reaches this file.
export default defineConfig([
  globalIgnores(['apps/**', '**/node_modules/**', '**/.next/**', '**/dist/**']),
  {
    files: ['packages/**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended, reactHooks.configs.flat.recommended],
  },
])

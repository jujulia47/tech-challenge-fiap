// The @fontsource/* packages ship CSS only (no bundled type declarations), so
// TypeScript cannot type these side-effect imports under moduleResolution
// "bundler". Declaring them as untyped modules resolves TS2882.
declare module '@fontsource/*'

import localFont from 'next/font/local'

// Block, because during a swap the name of the icon would show as text.
// The file holds only the icons in use: see "Icon font" in docs/fase4/performance.md
export const iconFont = localFont({
  src: '../fonts/material-icons-subset.woff2',
  display: 'block',
  weight: '400',
  variable: '--font-icons',
  adjustFontFallback: false,
})

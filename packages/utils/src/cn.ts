import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Typography utilities from globals.css. tailwind-merge does not know them and would
// otherwise treat them as text colors, dropping them when a color follows.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'meta',
            'meta-semibold',
            'body',
            'body-semibold',
            'nav',
            'nav-bold',
            'label',
            'heading',
            'display',
            'icon-xs',
            'icon-sm',
            'icon-md',
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import type { Metadata } from 'next'

// The zones are served under the shell, which has the icon (apps/shell/src/app/icon.svg). With no
// link to it, the browser asks the shell for /favicon.ico, which does not exist: a 404 on each page.
export const SHELL_ICONS: Metadata['icons'] = { icon: '/icon.svg' }

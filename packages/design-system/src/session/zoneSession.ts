'use client'

import { getSession, signOut } from 'next-auth/react'
import { createShellClient } from '@bytebank/bff/client'
import { createSessionWrites } from './sessionWrites'

const shell = createShellClient()

// One per page: the reads of the idle guard and the writes of the header and the forms share it
const zoneSession = createSessionWrites({
  getSession,
  signOut: () => signOut({ redirect: false }),
  endAllSessions: () => shell.endAllSessions(),
})

export const readSession = zoneSession.read
export const waitForSessionReads = zoneSession.settle
// This browser only (the inactivity logout, and after a new password, which ended them already)
export const signOutCompletely = zoneSession.signOut
// Every device: "Sair" of the menu
export const signOutEverywhere = zoneSession.signOutEverywhere

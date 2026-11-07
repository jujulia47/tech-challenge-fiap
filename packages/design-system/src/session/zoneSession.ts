'use client'

import { getSession, signOut } from 'next-auth/react'
import { createSessionWrites } from './sessionWrites'

// One per page: the reads of the idle guard and the writes of the header and the forms share it
const zoneSession = createSessionWrites({ getSession, signOut: () => signOut({ redirect: false }) })

export const readSession = zoneSession.read
export const waitForSessionReads = zoneSession.settle
export const signOutCompletely = zoneSession.signOut

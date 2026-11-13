'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createShellClient, type SessionPolicyDTO } from '@bytebank/bff/client'
import { SESSION_POLICY } from '@bytebank/utils'
import { Button } from '../Button'
import { Modal } from '../Modal'
import { createIdleMonitor, type IdleMonitor } from './idleMonitor'
import { createStorageIdleChannel } from './storageIdleChannel'
import { readSession, signOutCompletely } from './zoneSession'

// What the guard needs from outside. The defaults talk to the shell and to Auth.js; a story
// gives its own, so it runs with short times and no network.
export interface IdleSessionServices {
  loadPolicy: () => Promise<SessionPolicyDTO>
  // Reading the session renews it. The API routes do not, so a long stay on one screen would expire.
  renew: () => void
  expire: () => void
}

interface IdleSessionGuardProps {
  services?: IdleSessionServices
}

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const
// A screen reader hears these moments only, not every second
const ANNOUNCED_SECONDS = [30, 10]
const DESCRIPTION_ID = 'idle-warning-description'

const shell = createShellClient()

async function endSession(): Promise<void> {
  await signOutCompletely().catch(() => undefined)
  // A full load: the login is in the shell, outside the zones
  window.location.assign('/?reason=idle')
}

const BROWSER_SERVICES: IdleSessionServices = {
  // On the shell, the same origin as the zones: read at run time, so it needs no rebuild.
  // With no answer, the defaults of the code.
  loadPolicy: () => shell.fetchSessionPolicy().catch(() => SESSION_POLICY),
  renew: () => void readSession().catch(() => undefined),
  expire: () => void endSession(),
}

function announcementFor(remainingSeconds: number, warningSeconds: number): string {
  const moment = [...ANNOUNCED_SECONDS]
    .reverse()
    .find(seconds => remainingSeconds <= seconds && seconds < warningSeconds)
  return moment ? `Restam ${moment} segundos.` : ''
}

export function IdleSessionGuard({ services = BROWSER_SERVICES }: IdleSessionGuardProps) {
  const { status } = useSession()
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [warningSeconds, setWarningSeconds] = useState<number>(SESSION_POLICY.idleWarningSeconds)
  const monitorRef = useRef<IdleMonitor | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    let cleanup = () => {}

    void services.loadPolicy().then(policy => {
      if (cancelled) return
      setWarningSeconds(policy.idleWarningSeconds)

      const monitor = createIdleMonitor({
        timeoutMs: policy.idleTimeoutSeconds * 1_000,
        warningMs: policy.idleWarningSeconds * 1_000,
        renewEveryMs: policy.updateAgeSeconds * 1_000,
        channel: createStorageIdleChannel(),
        onChange: state => setRemainingSeconds(state.phase === 'warning' ? state.remainingSeconds : null),
        onExpire: services.expire,
        onRenew: services.renew,
      })
      const handleActivity = () => monitor.recordActivity()
      const options = { capture: true, passive: true }
      for (const name of ACTIVITY_EVENTS) window.addEventListener(name, handleActivity, options)
      monitorRef.current = monitor

      cleanup = () => {
        for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, handleActivity, options)
        monitor.stop()
        monitorRef.current = null
      }
    })

    return () => {
      cancelled = true
      cleanup()
    }
  }, [status, services])

  const stayConnected = () => monitorRef.current?.stayConnected()

  return (
    <Modal
      isOpen={remainingSeconds !== null}
      onClose={stayConnected}
      title="Sua sessão vai expirar"
      role="alertdialog"
      describedBy={DESCRIPTION_ID}
      showCloseButton={false}
    >
      <p id={DESCRIPTION_ID} className="text-body text-text-primary mt-4">
        Por inatividade, você será desconectado para proteger sua conta.
      </p>
      <p aria-hidden="true" className="text-body-semibold text-text-primary mt-2 mb-6">
        Tempo restante: {remainingSeconds} s
      </p>
      <p aria-live="polite" className="sr-only">
        {remainingSeconds === null ? '' : announcementFor(remainingSeconds, warningSeconds)}
      </p>
      {/* One button: Tab must not leave the dialog for the page behind it */}
      <div onKeyDown={event => event.key === 'Tab' && event.preventDefault()}>
        <Button variant="success" label="Continuar conectado" onClick={stayConnected} autoFocus fullWidth />
      </div>
    </Modal>
  )
}

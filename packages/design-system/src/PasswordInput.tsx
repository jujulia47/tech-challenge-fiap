'use client'

import { useState } from 'react'
import { Input } from './Input'
import { visibilityToggle } from './password/visibilityToggle'

interface PasswordInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  autoFocus?: boolean
  error?: string
  // current-password where a password is typed, new-password where one is created
  autoComplete?: 'current-password' | 'new-password'
}

// A password field with a button to show what was typed. No strength and no criteria: for those,
// where a password is created, PasswordField uses this field.
export function PasswordInput({ autoComplete = 'current-password', ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const toggle = visibilityToggle(visible)

  return (
    <Input
      {...props}
      type={toggle.type}
      autoComplete={autoComplete}
      trailing={
        <button
          type="button"
          onClick={() => setVisible(current => !current)}
          aria-label={toggle.label}
          aria-pressed={visible}
          className="flex text-primary-800 rounded-md focus-visible:outline-2 focus-visible:outline-primary-900"
        >
          <span className="material-icons text-icon-sm" aria-hidden="true">
            {toggle.icon}
          </span>
        </button>
      }
    />
  )
}

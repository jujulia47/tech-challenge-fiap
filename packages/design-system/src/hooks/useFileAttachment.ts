'use client'

import { useRef, useState } from 'react'

export interface FileAttachment {
  // The file as a data URL, ready to send, or undefined with no file
  dataUrl: string | undefined
  name: string
  error: string
  inputRef: React.RefObject<HTMLInputElement | null>
  choose: (event: React.ChangeEvent<HTMLInputElement>) => void
  // Forgets the file and empties the input, so choosing the same file again fires a change
  clear: () => void
}

// The file of an <input type="file">, read as a data URL. A file over maxBytes is refused with a
// message, and the file chosen before stays.
export function useFileAttachment(maxBytes: number): FileAttachment {
  const [dataUrl, setDataUrl] = useState<string | undefined>(undefined)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > maxBytes) {
      setError(`Arquivo deve ter no máximo ${maxBytes / 1024}KB`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setDataUrl(reader.result as string)
      setName(file.name)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  function clear() {
    setDataUrl(undefined)
    setName('')
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return { dataUrl, name, error, inputRef, choose, clear }
}

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  placeholder: string
  options: SelectOption[]
  value: string
  onChange: (v: string) => void
}

export function Select({ label, placeholder, options, value, onChange }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = options.find(o => o.value === value)
  const selectId = placeholder.toLowerCase().replace(/\s/g, '-')
  const listboxId = `${selectId}-listbox`

  function handleSelect(optionValue: string) {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-meta text-primary-800">
          {label}
        </label>
      )}

      <div
        className="relative"
        onBlur={e => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsOpen(false)
          }
        }}
      >
        <button
          id={selectId}
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          className={cn(
            'w-full h-12 px-4 rounded-md border bg-inverse text-body text-primary-800',
            'flex items-center justify-between',
            'focus:outline-none',
            isOpen ? 'border-2 border-primary-800' : 'border-primary-900',
          )}
        >
          <span className={cn('truncate', !selected && 'text-text-secondary')}>
            {selected ? selected.label : placeholder}
          </span>
          <span className="material-icons text-primary-900 text-icon-md select-none">
            {isOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
          </span>
        </button>

        {isOpen && (
          <ul
            id={listboxId}
            role="listbox"
            className={cn(
              'flex flex-col',
              'absolute z-10 w-full mt-1',
              'bg-inverse border border-primary-800 rounded-md',
              'max-h-48 overflow-y-auto',
            )}
          >
            {options.map(option => (
              <li
                key={option.value}
                role="option"
                tabIndex={0}
                aria-selected={option.value === value}
                className={cn(
                  'px-4 py-2 text-body text-primary-800 cursor-pointer',
                  'hover:bg-primary-50',
                  'focus:bg-primary-50 focus:outline-none',
                  option.value === value && 'bg-primary-50 font-bold',
                )}
                onMouseDown={e => e.preventDefault()}
                onClick={() => handleSelect(option.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSelect(option.value)
                  }
                }}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

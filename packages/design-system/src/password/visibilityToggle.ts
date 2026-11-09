export interface VisibilityToggle {
  type: 'password' | 'text'
  label: string
  icon: string
}

// What the field and its button show for each state. The button says what it will do.
export function visibilityToggle(visible: boolean): VisibilityToggle {
  return visible
    ? { type: 'text', label: 'Ocultar senha', icon: 'visibility_off' }
    : { type: 'password', label: 'Mostrar senha', icon: 'visibility' }
}

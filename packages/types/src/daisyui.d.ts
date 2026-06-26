declare module 'daisyui' {
  interface DaisyUIOptions {
    themes?: boolean | string[] | string
    logs?: boolean
    prefix?: string
    root?: string
    include?: string[]
    exclude?: string[]
  }
  const daisyui: (options?: DaisyUIOptions) => unknown
  export default daisyui
}

/// <reference types="vite/client" />

declare module '*.css?inline' {
  const css: string
  export default css
}

declare module 'virtual:wely-tailwind.css?inline' {
  const css: string
  export default css
}

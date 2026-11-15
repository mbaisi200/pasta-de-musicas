/**
 * pdf.js é usado no servidor (player) e no cliente (análise da partitura).
 * A biblioteca não traz tipos para o caminho `build/pdf.mjs` que usamos aqui.
 */
declare module 'pdfjs-dist/build/pdf.mjs' {
  export const GlobalWorkerOptions: { workerSrc: string }
  export function getDocument(src: {
    data: Uint8Array
    useSystemFonts?: boolean
    disableFontFace?: boolean
  }): { promise: Promise<{
    numPages: number
    getPage(n: number): Promise<{
      getTextContent(): Promise<{
        items: {
          str: string
          transform: number[]
          height?: number
        }[]
      }>
    }>
    destroy(): Promise<void>
  }> }
}

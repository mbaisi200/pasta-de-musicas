import type { SVGProps } from 'react'

import { CLAVE_SOL, CLAVE_SOL_NORMALIZAR } from './clave-sol'

/**
 * Ícones musicais desenhados para o Pasta de Músicas.
 *
 * Os ícones genéricos (Lucide) são abstratos e não comunicam a ideia de
 * partitura, cifra, teclado, metrônomo. Este conjunto é desenhado no mesmo
 * grid de 24×24, com o mesmo peso de traço, para conversar com o resto da
 * interface — mas com formas realmente musicais:
 *
 *   clave de sol · clave de fá · semínima · colcheias · pentagrama ·
 *   teclado · trompete · contrabaixo · violão · bateria · microfone ·
 *   cifra · letra · metrônomo · afinador · vinil · sax
 */

export type IconeMusical = (props: SVGProps<SVGSVGElement>) => React.ReactElement

function Base({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  )
}

/* ============================================================== claves */

/**
 * Clave de sol — glifo cheio (o símbolo do app).
 *
 * É o desenho clássico da clave de sol, em domínio público (Wikimedia
 * Commons), embutido como traço vetorial e normalizado para a caixa 24×24.
 * Preenchido com `currentColor`, herda a cor de onde estiver.
 */
export const ClaveDeSol = ((props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden
    {...props}
  >
    <g transform={CLAVE_SOL_NORMALIZAR}>
      <path d={CLAVE_SOL} />
    </g>
  </svg>
)) as IconeMusical

/**
 * Marca do app: a mesma clave, com menos folga nas laterais.
 * Serve para os lugares pequenos (cabeçalho, favicon, atalho).
 */
export const ClaveDeSolMarca = ((props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden
    {...props}
  >
    <g transform={`${CLAVE_SOL_NORMALIZAR} translate(12 12) scale(1.12) translate(-12 -12)`}>
      <path d={CLAVE_SOL} />
    </g>
  </svg>
)) as IconeMusical

/* =============================================================== notas */

/** Semínima (uma nota). */
export const Seminima = ((props) => (
  <Base {...props}>
    <ellipse cx="8" cy="18" rx="3.6" ry="2.6" transform="rotate(-18 8 18)" />
    <path d="M11.4 17.6V5.4" />
    <path d="M11.4 5.4c2.6 0 4.6 1.4 4.6 3.4" />
  </Base>
)) as IconeMusical

/** Colcheias ligadas (duas notas). */
export const Colcheias = ((props) => (
  <Base {...props}>
    <ellipse cx="7" cy="18" rx="3.2" ry="2.4" transform="rotate(-16 7 18)" />
    <ellipse cx="17" cy="16" rx="3.2" ry="2.4" transform="rotate(-16 17 16)" />
    <path d="M10.2 17.6V7.2M20.2 15.6V5.2" />
    <path d="M10.2 7.2l10-2v10.4" />
  </Base>
)) as IconeMusical

/** Pentagrama com nota — "partitura". */
export const Pentagrama = ((props) => (
  <Base {...props}>
    <path d="M2 8h20M2 11.4h20M2 14.8h20M2 18.2h20" />
    <ellipse cx="9" cy="18.2" rx="2.8" ry="2" transform="rotate(-18 9 18.2)" />
    <path d="M11.8 18V6.4" />
  </Base>
)) as IconeMusical

/* ========================================================= instrumentos */

/** Teclado de piano. */
export const Teclado = ((props) => (
  <Base {...props}>
    <rect x="2" y="6" width="20" height="12" rx="1.6" />
    <path d="M6.7 6v12M11.3 6v12M16 6v12" />
    {/* teclas pretas (padrão 2 + 3) */}
    <rect x="5" y="6" width="1.7" height="7" rx="0.6" fill="currentColor" stroke="none" />
    <rect x="9.6" y="6" width="1.7" height="7" rx="0.6" fill="currentColor" stroke="none" />
    <rect x="14.3" y="6" width="1.7" height="7" rx="0.6" fill="currentColor" stroke="none" />
  </Base>
)) as IconeMusical

/** Trompete. */
export const Trumpete = ((props) => (
  <Base {...props}>
    <path d="M3 10.5h10l3.5-2.5v8L13 13.5H3z" />
    <path d="M16.5 8l4-3v14l-4-3" />
    <path d="M7 10.5V7.5M10 10.5V7.5M13 10.5V7.5" />
    <path d="M3 12.5v2" />
  </Base>
)) as IconeMusical

/** Contrabaixo / baixo elétrico (corpo + braço). */
export const Baixo = ((props) => (
  <Base {...props}>
    {/* braço */}
    <path d="M20.4 3.6 14.6 9.4" />
    <path d="M19.6 2.8l1.6 1.6" />
    {/* corpo */}
    <path d="M14 8.8c1.4.2 2.3 1.3 1.9 2.6-.3 1.1-1.4 1.3-1.4 2.4 0 2.7-2.2 4.9-4.9 4.9s-4.9-2.2-4.9-4.9 2.2-4.9 4.9-4.9c1.1 0 1.3-1.2 2.4-1.4.6-.1 1.3 0 2 .3z" />
    {/* captadores */}
    <path d="M7.6 15.4h4.6M7.6 17.2h4.6" />
  </Base>
)) as IconeMusical

/** Violão. */
export const Violao = ((props) => (
  <Base {...props}>
    <path d="M20 4l-6.2 6.2" />
    <path d="M20 2.5v3.2" />
    <path d="M17.4 2.5h2.6" />
    <path d="M13.8 10.2c1.6 0 2.6 1.2 2.2 2.6-.3 1.2-1.6 1.4-1.6 2.6 0 3-2.4 5.4-5.4 5.4S3.6 18.4 3.6 15.4c0-3 2.4-5.4 5.4-5.4 1.2 0 1.4-1.3 2.6-1.6.6-.2 1.3-.2 2.2-.2z" />
    <circle cx="9" cy="15.4" r="1.7" />
  </Base>
)) as IconeMusical

/** Bateria (caixa + prato). */
export const Bateria = ((props) => (
  <Base {...props}>
    <ellipse cx="10" cy="9" rx="7.5" ry="2.6" />
    <path d="M2.5 9v5.4c0 1.4 3.4 2.6 7.5 2.6s7.5-1.2 7.5-2.6V9" />
    <path d="M2.5 12c0 1.4 3.4 2.6 7.5 2.6s7.5-1.2 7.5-2.6" />
    <path d="M17.5 5.6 21 4M19 2.5l2 3.6" />
  </Base>
)) as IconeMusical

/** Saxofone. */
export const Sax = ((props) => (
  <Base {...props}>
    <path d="M9 3v6.5a6 6 0 0 0 6 6" />
    <path d="M15 15.5c0 3-2 5.5-5 5.5" />
    <path d="M9 3h3.5" />
    <path d="M17 9.5l3 2.5" />
    <circle cx="8.6" cy="19.4" r="1.6" />
  </Base>
)) as IconeMusical

/** Flauta. */
export const Flauta = ((props) => (
  <Base {...props}>
    <rect x="2.5" y="9" width="19" height="6" rx="3" />
    <circle cx="7" cy="12" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="11" cy="12" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="0.9" fill="currentColor" stroke="none" />
    <path d="M19 9.5v5" />
  </Base>
)) as IconeMusical

/** Microfone (voz). */
export const Microfone = ((props) => (
  <Base {...props}>
    <rect x="9" y="2" width="6" height="11.5" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
    <path d="M12 18v4M8.5 22h7" />
    <path d="M9.5 6h5" />
  </Base>
)) as IconeMusical

/* ==================================================== tipos de conteúdo */

/** Cifra: diagrama de acorde. */
export const Cifra = ((props) => (
  <Base {...props}>
    <rect x="3.5" y="3" width="17" height="18" rx="1.5" />
    <path d="M3.5 7.4h17M3.5 11.6h17M3.5 15.8h17" />
    <path d="M9 3v18M14.5 3v18" />
    <circle cx="9" cy="7.4" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="11.6" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="9" cy="15.8" r="1.5" fill="currentColor" stroke="none" />
  </Base>
)) as IconeMusical

/** Letra: folha com versos. */
export const Letra = ((props) => (
  <Base {...props}>
    <path d="M5.5 2.5h8.5l4.5 4.5v14.5H5.5z" />
    <path d="M14 2.5V7h4.5" />
    <path d="M8.5 11h6M8.5 14h6M8.5 17h3.5" />
  </Base>
)) as IconeMusical

/** Real book / songbook. */
export const Songbook = ((props) => (
  <Base {...props}>
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z" />
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M9 6.5v4" />
    <ellipse cx="7.8" cy="11.2" rx="1.6" ry="1.2" transform="rotate(-18 7.8 11.2)" />
    <path d="M9 6.5c1.6 0 2.6.8 2.6 1.8" />
  </Base>
)) as IconeMusical

/** Áudio / gravação. */
export const Audio = ((props) => (
  <Base {...props}>
    <path d="M2 12h2.4M6.8 8v8M11 4.5v15M15.2 8.5v7M19.4 10.5v3M21.6 12h.4" />
  </Base>
)) as IconeMusical

/* ============================================================== objetos */

/** Metrônomo. */
export const Metronomo = ((props) => (
  <Base {...props}>
    <path d="M9.6 21h4.8L18.4 5.4a1 1 0 0 0-1-1.2H6.6a1 1 0 0 0-1 1.2z" />
    <path d="M12 8.4V21" />
    <path d="M12 12.6l5-3.6" />
    <circle cx="17.4" cy="8.4" r="1.2" fill="currentColor" stroke="none" />
  </Base>
)) as IconeMusical

/** Afinador (diapasão). */
export const Afinador = ((props) => (
  <Base {...props}>
    <path d="M7.5 2.5v7a4.5 4.5 0 0 0 9 0v-7" />
    <path d="M12 14v7.5" />
    <path d="M8.5 21.5h7" />
  </Base>
)) as IconeMusical

/** Vinil. */
export const Vinil = ((props) => (
  <Base {...props}>
    <circle cx="12" cy="12" r="9.2" />
    <circle cx="12" cy="12" r="5.6" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <path d="M12 2.8a9.2 9.2 0 0 1 9.2 9.2" strokeOpacity={0.5} />
  </Base>
)) as IconeMusical

/** Pasta de músicas com a clave de sol (logo do app). */
export const PastaDeMusicas = ((props) => (
  <Base {...props}>
    <path d="M2.2 6.6A2.1 2.1 0 0 1 4.3 4.5h3.9c.5 0 1 .2 1.4.6l1.5 1.6h6.6a2.1 2.1 0 0 1 2.1 2.1v9.1a2.1 2.1 0 0 1-2.1 2.1H4.3a2.1 2.1 0 0 1-2.1-2.1z" />
    <g transform="translate(7.3 7.6) scale(0.46)" fill="currentColor" stroke="none">
      <g transform={CLAVE_SOL_NORMALIZAR}>
        <path d={CLAVE_SOL} />
      </g>
    </g>
  </Base>
)) as IconeMusical

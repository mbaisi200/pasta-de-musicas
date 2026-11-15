import { cn } from '@/lib/utils'

/**
 * Capa procedural do SetList.
 *
 * Cada repertório ganha uma "capa" gerada: o mesmo nome sempre produz a
 * mesma arte (hash do nome → matiz e padrão). É o que dá identidade visual
 * ao app sem precisar de imagem: o músico reconhece o SetList pela capa.
 */

const PALETAS = [
  ['#f0a83c', '#c2410c', '#7c2d12'],
  ['#38bdf8', '#4f46e5', '#1e1b4b'],
  ['#34d399', '#0f766e', '#134e4a'],
  ['#f472b6', '#be185d', '#500724'],
  ['#a78bfa', '#6d28d9', '#2e1065'],
  ['#fb923c', '#dc2626', '#7f1d1d'],
  ['#facc15', '#ca8a04', '#713f12'],
  ['#2dd4bf', '#0d9488', '#134e4a'],
]

function hash(texto: string): number {
  let valor = 0
  for (let i = 0; i < texto.length; i++) {
    valor = (valor * 31 + texto.charCodeAt(i)) % 100000
  }
  return valor
}

function iniciais(nome: string): string {
  const partes = nome
    .split(/[\s\-_]+/)
    .filter((p) => p.length > 0 && !/^[0-9]+$/.test(p))
  if (partes.length === 0) return '#'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

interface PropsCapa {
  nome: string
  /** 'sm' | 'md' | 'lg' | 'xl' */
  tamanho?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const TAMANHOS = {
  sm: { caixa: 'size-10', raio: 'rounded-lg', fonte: 'text-[10px]' },
  md: { caixa: 'size-14', raio: 'rounded-xl', fonte: 'text-xs' },
  lg: { caixa: 'size-24', raio: 'rounded-2xl', fonte: 'text-lg' },
  xl: { caixa: 'size-48', raio: 'rounded-3xl', fonte: 'text-4xl' },
}

export function CapaSetList({ nome, tamanho = 'md', className }: PropsCapa) {
  const semente = hash(nome || 'setlist')
  const paleta = PALETAS[semente % PALETAS.length]
  const padrao = semente % 4
  const id = `capa-${semente}`

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden shadow-lg',
        TAMANHOS[tamanho].caixa,
        TAMANHOS[tamanho].raio,
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" className="size-full">
        <defs>
          <linearGradient id={`${id}-fundo`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={paleta[0]} />
            <stop offset="55%" stopColor={paleta[1]} />
            <stop offset="100%" stopColor={paleta[2]} />
          </linearGradient>
          <radialGradient id={`${id}-brilho`} cx="30%" cy="20%" r="70%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100" height="100" fill={`url(#${id}-fundo)`} />

        {/* padrão musical */}
        {padrao === 0 && (
          <g stroke="#fff" strokeOpacity="0.22" strokeWidth="1.4">
            {[26, 34, 42, 50, 58, 66].map((y) => (
              <line key={y} x1="0" y1={y} x2="100" y2={y} />
            ))}
          </g>
        )}
        {padrao === 1 && (
          <g fill="none" stroke="#fff" strokeOpacity="0.26" strokeWidth="2">
            <path d="M0 62 C 18 44, 32 80, 50 62 S 82 44, 100 62" />
            <path d="M0 74 C 18 56, 32 92, 50 74 S 82 56, 100 74" />
          </g>
        )}
        {padrao === 2 && (
          <g fill="#fff" fillOpacity="0.16">
            <circle cx="26" cy="30" r="14" />
            <circle cx="62" cy="52" r="20" />
            <circle cx="86" cy="24" r="9" />
          </g>
        )}
        {padrao === 3 && (
          <g fill="#fff" fillOpacity="0.14">
            <rect x="8" y="18" width="10" height="64" rx="5" />
            <rect x="30" y="30" width="10" height="52" rx="5" />
            <rect x="52" y="14" width="10" height="68" rx="5" />
            <rect x="74" y="38" width="10" height="44" rx="5" />
          </g>
        )}

        <rect width="100" height="100" fill={`url(#${id}-brilho)`} />

        {/* marca d'água musical — clave de sol estilizada */}
        <g
          fill="none"
          stroke="#fff"
          strokeOpacity="0.22"
          strokeWidth="2.4"
          strokeLinecap="round"
        >
          <path d="M58 74c-8 0-14-5-14-12 0-6.5 5-11 11-11 5 0 9 3.4 9 8 0 4-3 6.6-6.6 6.6" />
          <path d="M58 74c5-4 7.6-9.6 7.6-16.6V24c0-5-2.8-8.6-7-8.6-3.8 0-6.4 2.8-6.4 6.4 0 4.4 3.4 7.4 8.2 7.4 7 0 11.8-5 11.8-11.4" />
        </g>

        <text
          x="14"
          y="90"
          fill="#fff"
          fillOpacity="0.9"
          className="font-semibold tracking-tight"
          style={{ fontSize: tamanho === 'sm' ? 26 : tamanho === 'md' ? 22 : 20 }}
        >
          {iniciais(nome)}
        </text>
      </svg>
    </div>
  )
}

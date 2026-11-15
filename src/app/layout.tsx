import type { Metadata, Viewport } from 'next'

import { Toaster } from 'sonner'

import { Cabecalho } from '@/components/layout/cabecalho'
import { ProvedorAuth } from '@/components/auth/provedor-auth'
import { PromptInstalar } from '@/components/pwa/prompt-instalar'
import { RegistrarServiceWorker } from '@/components/pwa/registrar-sw'
import { TooltipProvider } from '@/components/ui/tooltip'
import { scriptTema } from '@/hooks/use-tema'

import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Pasta de Músicas',
    template: '%s · Pasta de Músicas',
  },
  description:
    'Organize, pesquise e toque suas partituras em qualquer dispositivo: celular, tablet ou computador.',
  applicationName: 'Pasta de Músicas',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Músicas',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#101013' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-dvh bg-background font-sans antialiased">
        <TooltipProvider delayDuration={200}>
          <ProvedorAuth>
            <div className="flex min-h-dvh flex-col">
              <Cabecalho />
              <main className="flex-1">{children}</main>
            </div>
          </ProvedorAuth>
          <PromptInstalar />
        </TooltipProvider>
        <Toaster position="top-center" richColors closeButton />
        <RegistrarServiceWorker />
      </body>
    </html>
  )
}

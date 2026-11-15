'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, Loader2, ListMusic, Lock, Mail, User } from 'lucide-react'

import { authNaoConfigurado, useAuth } from '@/components/auth/provedor-auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export default function PaginaEntrar() {
  const router = useRouter()
  const parametros = useSearchParams()
  const { entrar, registrar, usuario } = useAuth()

  const [email, setEmail] = React.useState('')
  const [senha, setSenha] = React.useState('')
  const [nome, setNome] = React.useState('')
  const [verSenha, setVerSenha] = React.useState(false)
  const [erro, setErro] = React.useState('')
  const [processando, setProcessando] = React.useState(false)
  const [cadastroAberto, setCadastroAberto] = React.useState<boolean | null>(null)

  const proximo = parametros.get('proximo') || '/'

  React.useEffect(() => {
    if (usuario) router.replace(proximo)
  }, [usuario, router, proximo])

  // O cadastro só fica aberto enquanto não existir nenhum usuário.
  React.useEffect(() => {
    fetch('/api/sessao/registro', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setCadastroAberto(d.total === 0))
      .catch(() => setCadastroAberto(false))
  }, [])

  async function aoEntrar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro('')
    setProcessando(true)
    try {
      await entrar(email.trim(), senha)
      router.replace(proximo)
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setProcessando(false)
    }
  }

  async function aoRegistrar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro('')
    setProcessando(true)
    try {
      await registrar(email.trim(), senha, nome.trim())
      router.replace(proximo)
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setProcessando(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* fundo decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 10%, var(--primary) 0, transparent 45%), radial-gradient(circle at 85% 90%, var(--primary) 0, transparent 40%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <ListMusic className="size-7" />
          </span>
          <h1 className="mt-3 text-xl font-semibold tracking-tight">Pasta de Músicas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre para acessar seu repertório
          </p>
        </div>

        <Card className="p-5 shadow-lg sm:p-6">
          {authNaoConfigurado() ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertCircle className="size-8 text-destructive" />
              <div>
                <p className="font-medium">Login não configurado</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Faltam as variáveis do Firebase Web SDK no ambiente.
                </p>
              </div>
              <code className="w-full overflow-x-auto rounded-md bg-muted p-2 text-left text-xs">
                NEXT_PUBLIC_FIREBASE_API_KEY=…
                <br />
                NEXT_PUBLIC_FIREBASE_APP_ID=…
              </code>
            </div>
          ) : (
            <Tabs defaultValue="entrar">
              <TabsList className="w-full">
                <TabsTrigger value="entrar" className="flex-1">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="cadastro" className="flex-1" disabled={cadastroAberto === false}>
                  Criar conta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="entrar">
                <form onSubmit={aoEntrar} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@email.com"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="senha">Senha</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="senha"
                        type={verSenha ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9 pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setVerSenha((v) => !v)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {erro && <MensagemErro texto={erro} />}

                  <Button type="submit" className="w-full" disabled={processando}>
                    {processando && <Loader2 className="size-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="cadastro">
                {cadastroAberto === false ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    O cadastro está fechado. Peça a um administrador para criar sua conta.
                  </p>
                ) : (
                  <form onSubmit={aoRegistrar} className="space-y-4">
                    <p className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
                      Primeira conta: você será o administrador do app.
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor="nome-cadastro">Nome</Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="nome-cadastro"
                          autoComplete="name"
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          placeholder="Como te chamamos?"
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email-cadastro">E-mail</Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="email-cadastro"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="voce@email.com"
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="senha-cadastro">Senha</Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="senha-cadastro"
                          type={verSenha ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          minLength={6}
                          value={senha}
                          onChange={(e) => setSenha(e.target.value)}
                          placeholder="mínimo 6 caracteres"
                          className="pl-9 pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setVerSenha((v) => !v)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                        >
                          {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    {erro && <MensagemErro texto={erro} />}

                    <Button type="submit" className="w-full" disabled={processando}>
                      {processando && <Loader2 className="size-4 animate-spin" />}
                      Criar conta
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          )}
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Suas partituras ficam guardadas no seu Firebase.{' '}
          <Link href="/entrar" className="underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

function MensagemErro({ texto }: { texto: string }) {
  return (
    <p
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive',
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{texto}</span>
    </p>
  )
}

function mensagemDeErro(erro: unknown): string {
  const texto = erro instanceof Error ? erro.message : String(erro)
  if (/invalid-credential/i.test(texto)) return 'E-mail ou senha incorretos.'
  if (/email-already-in-use/i.test(texto)) return 'Já existe uma conta com esse e-mail.'
  if (/weak-password/i.test(texto)) return 'A senha é muito fraca. Use ao menos 6 caracteres.'
  if (/too-many-requests/i.test(texto)) return 'Muitas tentativas. Tente novamente em instantes.'
  if (/network-request-failed/i.test(texto)) return 'Sem conexão com a internet.'
  return texto.replace('Firebase: ', '').replace(/ \(auth\/.+\)\.?$/, '')
}

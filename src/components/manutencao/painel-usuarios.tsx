'use client'

import * as React from 'react'
import { Loader2, Mail, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Usuario {
  uid: string
  email: string
  nome: string
  criadoEm: string
  ultimoAcesso: string
  desativado: boolean
}

/**
 * Painel de usuários — só o administrador vê.
 *
 * Criar/excluir contas do app. A senha é digitada pelo administrador e
 * comunicada ao usuário (o Firebase Auth guarda apenas o hash).
 */
export function PainelUsuarios({
  admin,
  uidAtual,
}: {
  admin: boolean
  uidAtual: string
}) {
  const [usuarios, setUsuarios] = React.useState<Usuario[]>([])
  const [carregando, setCarregando] = React.useState(false)
  const [aberto, setAberto] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [nome, setNome] = React.useState('')
  const [senha, setSenha] = React.useState('')
  const [salvando, setSalvando] = React.useState(false)

  async function carregar() {
    setCarregando(true)
    try {
      const resposta = await fetch('/api/usuarios', { cache: 'no-store' })
      if (!resposta.ok) return
      const dados = await resposta.json()
      setUsuarios(dados.usuarios ?? [])
    } catch {
      toast.error('Falha ao carregar os usuários.')
    } finally {
      setCarregando(false)
    }
  }

  async function criar(evento: React.FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    try {
      const resposta = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha, nome }),
      })
      const dados = await resposta.json().catch(() => ({}))
      if (!resposta.ok) {
        toast.error(dados?.erro ?? 'Não foi possível criar o usuário.')
        return
      }
      toast.success(`Conta de ${email} criada.`)
      setEmail('')
      setNome('')
      setSenha('')
      void carregar()
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(uid: string, emailUsuario: string) {
    if (!confirm(`Excluir a conta de ${emailUsuario}?`)) return
    const resposta = await fetch('/api/usuarios', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    })
    const dados = await resposta.json().catch(() => ({}))
    if (!resposta.ok) {
      toast.error(dados?.erro ?? 'Não foi possível excluir.')
      return
    }
    toast.success('Conta excluída.')
    void carregar()
  }

  if (!admin) return null

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <Users className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Usuários do app</p>
          <p className="text-sm text-muted-foreground">
            {usuarios.length === 0
              ? 'Carregando...'
              : `${usuarios.length} ${usuarios.length === 1 ? 'conta' : 'contas'}`}
          </p>
        </div>
        <Dialog
          open={aberto}
          onOpenChange={(v) => {
            setAberto(v)
            if (v) void carregar()
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <UserPlus className="size-4" />
              Gerenciar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Usuários</DialogTitle>
              <DialogDescription>
                Cada pessoa usa o mesmo e-mail e senha para entrar no app.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {carregando && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Carregando...
                </div>
              )}
              {usuarios.map((u) => (
                <div
                  key={u.uid}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background p-2.5"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
                    {(u.nome || u.email).slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.nome}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail className="size-3 shrink-0" />
                      {u.email}
                    </p>
                  </div>
                  {u.uid === uidAtual && (
                    <Badge variant="secondary" className="shrink-0">
                      <ShieldCheck className="size-3" />
                      você
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => excluir(u.uid, u.email)}
                    aria-label={`Excluir ${u.email}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <form onSubmit={criar} className="space-y-3 border-t border-border pt-4">
              <p className="text-sm font-medium">Nova conta</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="usuario-email">E-mail</Label>
                  <Input
                    id="usuario-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pessoa@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="usuario-nome">Nome</Label>
                  <Input
                    id="usuario-nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="usuario-senha">Senha provisória</Label>
                <Input
                  id="usuario-senha"
                  type="text"
                  required
                  minLength={6}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="mínimo 6 caracteres — anote para passar ao usuário"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={salvando} className="gap-2">
                  {salvando && <Loader2 className="size-4 animate-spin" />}
                  Criar conta
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  )
}

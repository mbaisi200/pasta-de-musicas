# AGENTS.md — Pasta de Músicas

Instruções para agentes de código (IA) neste repositório.

> ## ⛔ Regra de ouro — Git
>
> **Nunca execute `git commit` nem `git push` sem pedido explícito e anterior
> do usuário.** Alterar o código, criar arquivos, rodar testes e deixar tudo
> pronto **não** autoriza commit nem push.
>
> - Pedido de alteração ≠ pedido de commit ≠ pedido de push.
> - O **push** exige o **próprio** pedido do usuário e a confirmação em dois
>   passos (resumo → "confirma o push?" → "sim").
> - Segredo em disco? Nunca. Token no chat? Use só na hora e avise para revogar.
>
> Detalhes, exemplos de comando e o que **não** fazer: seção
> **🚫 COMMIT E PUSH** logo abaixo.

## O que é este projeto

Versão web/nuvem do app **Músicas** (Visual FoxPro 9, desktop Windows).
Catálogo de partituras em PDF com:SetList (repertório), rolagem automática da
partitura, manutenção e ferramentas de afinador/metrônomo.

Stack: **Next.js 16** (App Router) + React 19 + TypeScript strict + Tailwind v4 +
Firebase (Firestore, Admin SDK no servidor) + react-pdf (pdf.js).
Deploy: **Vercel**. Funciona como PWA (instalável no Android/iOS).

## 🚫 COMMIT E PUSH — LEIA ANTES DE QUALQUER COMANDO GIT

> **REGRA ABSOLUTA: nunca execute `git commit` nem `git push` sem que o usuário
> tenha pedido isso de forma explícita e ANTES da execução.**

| Situação | Pode commitar? | Pode dar push? |
| --- | --- | --- |
| "melhore o layout", "crie a tela X", "isso está errado" | ❌ **NÃO** | ❌ **NÃO** |
| "faça o commit" | ✅ sim | ❌ não (push é outro pedido) |
| "sobe pro GitHub" / "faz o push" | ✅ sim | ⚠️ só após a confirmação do passo 2 |
| "commita e sobe" | ✅ sim | ⚠️ só após a confirmação do passo 2 |

### As regras, uma a uma

1. **Pedido de alteração ≠ pedido de commit.** Frases como "pode alterar",
   "ajuste", "está ruim", "faça isso" autorizam **apenas a alteração local**.
   O arquivo fica modificado no disco, sem commit.
2. **Commit só com pedido explícito**: "faça o commit", "commita", "commite",
   "gera o commit". Sem essas palavras, **não commita** — mesmo que o
   trabalho esteja pronto e testado.
3. **Push é uma etapa separada** do commit. Mesmo com o commit autorizado, o
   push exige o **próprio** pedido do usuário.
4. **Confirmação em dois passos para o push**:
   1. o usuário pede o push → o agente mostra o **resumo** (branch, arquivos,
      commit, o que será publicado) e pergunta: *"confirma o push em main?"*
   2. só com um **"sim"** explícito o push sai.
   - Um "sim" dito antes do resumo **não** vale; token colado no chat **não**
     vale; "já pode subir" **não** vale.
5. **Um único commit e um único push** com tudo (código + docs + scripts +
   migrations) — nunca dois pushes do mesmo conteúdo, nunca um commit
   "de ajuste" sobrando depois.
6. **Antes de commitar**, obrigatoriamente:
   ```bash
   npm run lint && npm run typecheck && npm run build && git status
   ```
   e conferir se **nada** ficou de fora (`git status` limpo depois do commit).
7. **Nunca commitar segredos**: `.env`, `.env.local`, chave da Service Account
   (`*.json` do Firebase), `*.key`, `*.pem`, `*.pfx`. O `.env.example` pode
   entrar, **apenas** com placeholders.
8. **Token colado no chat é token comprometido**: use só na hora do push,
   **sem** gravar em arquivo, `.git/config`, remote ou `~/.git-credentials` —
   e **avise para revogar depois**.
9. Se o usuário pedir para reverter, use `git revert` (não `reset`), para não
   apagar histórico já publicado.

### Como fazer o push sem deixar o token no disco

```bash
cat > /tmp/askpass.sh <<'EOF'
#!/bin/sh
case "$1" in
  *sername*) echo "x-access-token" ;;
  *assword*) echo "$GITHUB_TOKEN" ;;
esac
EOF
chmod +x /tmp/askpass.sh
GITHUB_TOKEN="..." GIT_ASKPASS=/tmp/askpass.sh GIT_TERMINAL_PROMPT=0 \
  git push https://github.com/<user>/<repo>.git main
rm -f /tmp/askpass.sh
```

## 🗄️ Dados

- **Firestore**: coleção `musicas` (documentos `vfp-001`, …), subcoleção
  `musicas/{id}/partitura` (PDF em base64) e `configuracoes/app`.
- **Partituras (PDF)**: em `musicas/{id}/partitura/atual` (base64) — limite de 700 KB por PDF (Firestore: 1 MiB por documento).
- Toda leitura/escrita passa pelo **servidor** (`src/lib/repositorio`).
  O SDK Admin ignora as regras — por isso `firestore.rules` é `deny all`
  para o cliente. **Não** libere acesso direto sem necessidade.
- **Não use Cloud Storage**: desde 03/02/2026 ele exige o plano Blaze (cartão
  de crédito). Os PDFs ficam no Firestore.
- O agente **nunca** roda `gcloud`/console do Firebase para alterar dados do
  usuário sem pedido explícito.

## 🧪 Teste (obrigatório antes de dizer que terminou)

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run build         # build de produção
npm run dev           # conferir no navegador (desktop + viewport mobile)
```

Níveis: 1) typecheck → 2) lint → 3) navegador (desktop 1280px e mobile 390px)
→ 4) build. Se o build falhar, não diga que terminou.

## 🔐 Autenticação

- **Toda página e toda API de dados exige sessão** (`exigirUsuario()` /
  `exigirSessaoApi()`). Não criar rota nova que pule essa guarda.
- Sessão = **session cookie httpOnly** (5 dias) criada em `/api/sessao`.
- O primeiro usuário do projeto é o **administrador**; os demais são criados
  em *Manutenção → Usuários* (só admin).
- O navegador usa o **Firebase Web SDK apenas para o login** — nunca para
  ler dados. O Firestore continua `deny all` para o cliente.
- `ADMIN_EMAILS` (opcional) fixa os administradores por e-mail.

## 📐 Regras de código

- `'use client'` só onde há estado/efeito/browser. O resto é Server Component.
- **Mobile-first**: alvo de toque ≥ 40 px (`h-10`/`size-10`); telas < 640 px
  em coluna; `sm:`/`lg:` para o refinamento desktop.
- **Cores**: use só os tokens do Tailwind (`bg-background`, `text-muted-foreground`,
  `border-border`, `bg-primary`…). **NUNCA** cores literais (`bg-slate-800`,
  `text-gray-500`): o app tem tema claro e escuro.
- Ícones: `lucide-react`.
- Sem `console.log` em `src/` (use `console.error` só em erro real).
- Sem `any`. Tipar callbacks. `zod` para validar entrada de API.
- Textos de interface em **português do Brasil**.
- Sem dependência nova sem necessidade — a Web Audio API resolve afinador e
  metrônomo.

## 📁 Onde mexer em cada coisa

| Assunto | Arquivo |
| --- | --- |
| Catálogo, filtros, ordenação | `src/components/catalogo/catalogo.tsx` |
| Player, rolagem automática, velocidade | `src/components/player/visualizador-pdf.tsx` |
| CRUD e reordenação de SetList | `src/components/manutencao/*` |
| Afinador e metrônomo | `src/components/ajuda/*` |
| API (criar/alterar/excluir/upload) | `src/app/api/**` |
| Modelo de dados | `src/lib/types.ts` (espelha `músicas.DBF`) |
| Firestore | `src/lib/repositorio/firebase.ts` |
| Modo local (sem Firebase) | `src/lib/repositorio/local.ts` |
| Migração do app VFP | `scripts/import-vfp.ts` |
| Login, sessão e papéis | `src/lib/sessao.ts`, `src/proxy.ts` |
| Layout responsivo (celular/tablet) | `docs/LAYOUT.md` |

## 📄 Documentação

- `README.md` — o que o app faz, stack, como rodar.
- `docs/DEPLOY.md` — publicação na nuvem (Vercel + Firebase), passo a passo.
- `docs/AUTENTICACAO.md` — login/senha, papéis e segurança.
- `docs/LAYOUT.md` — o layout em celular, tablet e desktop (breakpoints e regras).
- Ao criar/alterar funcionalidade, **atualize o README** (seção afetada).

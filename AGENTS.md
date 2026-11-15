# AGENTS.md — Pasta de Músicas

Instruções para agentes de código (IA) neste repositório.

## O que é este projeto

Versão web/nuvem do app **Músicas** (Visual FoxPro 9, desktop Windows).
Catálogo de partituras em PDF com:SetList (repertório), rolagem automática da
partitura, manutenção e ferramentas de afinador/metrônomo.

Stack: **Next.js 16** (App Router) + React 19 + TypeScript strict + Tailwind v4 +
Firebase (Firestore, Admin SDK no servidor) + react-pdf (pdf.js).
Deploy: **Vercel**. Funciona como PWA (instalável no Android/iOS).

## 🚫 Git

- **NUNCA** faça `git push`, `git commit` ou qualquer operação de push sem pedido
  **explícito** do usuário. Pedido de alteração ≠ pedido de push.
- Confirmação em **dois passos**: o usuário pede o push → o agente mostra o
  resumo (arquivos, versão) → o usuário confirma ("sim") → só então o push sai.
- **Um único commit e um único push** com tudo (código + docs + migrations).
- Nunca commite segredos: `.env`, `.env.local`, `service-account.json`, `*.key`.
  O pre-commit hook (se existir) bloqueia esses arquivos.
- `BUILD_NUMBER`/versão: este projeto não usa version.json. A versão do app é o
  campo `versao` em `configuracoes/app` (Firestore) — atualize no importador.

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

# Pasta de Músicas

Versão web (e mobile) do app **Músicas** que roda em Visual FoxPro 9 no desktop.
Mesma ideia, mesmas telas — adapted para celular, tablet e navegador, rodando na nuvem.

| App original (VFP, Windows) | Este projeto (web/nuvem) |
| --- | --- |
| `form1` — grade de músicas + PDF embebido (OLE `Shell.Explorer.2`) | `/` — catálogo com busca, filtros e SetList |
| Rolagem do PDF (botão *Rolar* / *Parar*, velocidade 1–9) | `/musica/[id]` — player com rolagem automática e velocidade 1–9 |
| `músicas` — manutenção (incluir/alterar/excluir, reordenar) | `/manutencao` — CRUD + reordenar SetList + enviar PDF |
| `ajuda` — ajuda, contato, *Equipamento* (Micro/Tablet/Celular) | `/ajuda` — ajuda + **Afinador** + **Metrônomo** (Web Audio) |
| Tabela `músicas.DBF` (Visual FoxPro) | Firestore (`musicas`) |
| Pasta `PDF/` no disco do Windows | Firestore (`musicas/{id}/partitura/atual`) |

---

## 1. O que o app faz

- **Catálogo** com busca (inclusive por voz), filtros combináveis, estatísticas
  do repertório e **capa gerada para cada SetList** — o mesmo repertório tem
  sempre a mesma arte, o que dá identidade visual ao app.
- **SetList (repertório)** agrupa as músicas; a ordem dentro do grupo define a sequência da execução — o player navega de uma para a outra sem parar.
- **Player de partitura** em PDF com:
  - rolagem automática (velocidade 0–9, igual ao VFP) com wake lock (tela não apaga),
  - navegação por página, zoom, tela cheia, atalhos de teclado e *swipe* no celular,
  - retomada da posição de cada música no dispositivo.
- **Manutenção**: cadastrar, alterar, excluir, reordenar (arrastar ou botões ↑ ↓) e enviar o PDF da partitura.
- **Carregar PDF e analisar**: ao escolher a partitura, o app lê o PDF no
  navegador e **preenche sozinho** nome da música, autor e instrumento
  (detecta "Teclado", "Trumpete", "Baixo" escritos na própria partitura),
  além do número de páginas.
- **Ajuda**: texto de ajuda, contato, seleção de equipamento e as ferramentas **Afinador** e **Metrônomo**.
- **PWA**: instalável na tela de início do Android/iOS, com modo offline para as partituras já tocadas.

---

## 2. Stack

- **Next.js 16** (App Router, React 19, TypeScript strict) — a mesma tela serve web e mobile.
- **Tailwind CSS v4** + componentes no estilo shadcn/ui.
- **Firebase** (projeto independente): Firestore para os dados **e para os PDFs** (base64, em subdocumento). Sem Cloud Storage — desde 03/02/2026 ele exige o plano pago (Blaze, com cartão de crédito); o Firestore funciona no **plano gratuito, sem cartão**.
- **react-pdf** (pdf.js) para renderizar a partitura com controle de scroll.
- **Web Audio API** para afinador e metrônomo — sem dependência extra.
- **Vercel** para publicar.

---

## 3. Rodando localmente

### 3.1 Modo demo (sem Firebase) — recomendado para começar

Sem nenhuma credencial o app sobe com um repositório local (arquivos em `.data/`):

```bash
npm install
npm run import:vfp -- --local   # importa as 17 músicas do app VFP + os PDFs
npm run dev                     # http://localhost:3000
```

### 3.2 Modo Firebase (igual à produção)

```bash
cp .env.example .env.local      # preencha com as credenciais do Admin SDK
npm run dev
```

> Atalho: depois de baixar a chave JSON da Service Account no console do
> Firebase, use `npm run config:env -- ~/Downloads/chave-do-firebase.json` —
> o script escreve o `.env.local` já com a chave privada escapada corretamente.

Para forçar o modo local mesmo com as credenciais presentes: `REPOSITORY=local npm run dev`.

### 3.3 Build de produção local

```bash
npm run build
npm start        # sobe o .next/standalone com static/ e public/ copiados
```

### 3.3 Importando os dados do app antigo

O importador lê `músicas.DBF` e `AJUDA.DBF` do Visual FoxPro e casa cada registro
com o PDF correspondente da pasta `PDF/` (inclusive quando o nome gravado no VFP
aponta para outro computador):

```bash
npm run import:vfp -- --dry-run   # prévia (tabela de correspondências)
npm run import:vfp -- --local     # grava em .data/
npm run import:vfp                # sobe para o Firestore
```

> A pasta do app legado é detectada em `../MusicaIvan/Músicas_Demo_copia`.
> Para outro caminho: `LEGACY_VFP_DIR=/caminho npm run import:vfp`.

---

## 4. Publicando na nuvem

O passo a passo completo está em **[docs/DEPLOY.md](docs/DEPLOY.md)**.
Resumo:

1. Crie um **projeto Firebase independente** (só Firestore — sem Storage).
2. Gere a chave da **Service Account** (JSON) e preencha `.env.local` /
   variáveis de ambiente da Vercel.
3. Suba o projeto na **Vercel** (import do repositório) com as variáveis acima.
4. Publique as regras: `npm run regras` (usa a chave da Service Account, sem CLI).
5. Importe os dados: `npm run import:vfp`.
6. No celular: abrir o site → *Adicionar à Tela de Início*.

---

## 5. Estrutura

```
src/
  app/
    page.tsx                  catálogo (server component)
    musica/[id]/page.tsx      player da partitura
    manutencao/page.tsx       CRUD
    ajuda/page.tsx            ajuda + afinador + metrônomo
    api/musicas/...           API (listar, criar, alterar, excluir, PDF, upload)
    api/configuracoes/...     configurações do app
  components/
    catalogo/                 lista, filtros, ordenação
    player/                   pdf.js, rolagem automática, controles
    manutencao/               formulário e reordenação
    ajuda/                    afinador e metrônomo
    pwa/                      prompt de instalação e service worker
    ui/                       componentes base (button, dialog, sheet, ...)
  lib/
    repositorio/              Firestore (produção) e arquivos locais (dev)
    firebase/admin.ts         Admin SDK
    types.ts                  modelo de dados (espelha o DBF do VFP)
scripts/
  import-vfp.ts               migração do app Visual FoxPro
  dbf.ts                      leitor de DBF
```

---

## 6. Modelo de dados

Coleção `musicas` (espelha `músicas.DBF`):

| Campo VFP | Campo atual | Observação |
| --- | --- | --- |
| `MÚSICA` | `musica` | nome da música |
| `AUTOR` | `autor` | |
| `GRUPO` | `grupo` | SetList / repertório |
| `ESTILO` | `estilo` | |
| `INSTRUMENT` | `instrumento` | |
| `PDF` (caminho local) | `arquivo` | metadados do arquivo |
| `ROLAMENTO` | `rolamento` | rolagem automática |
| `VELOCIDADE` | `velocidade` | 0–9 |
| `OBSERVAÇÕE` | `observacao` | |
| `ORDEM` | `ordem` | ordem dentro do SetList |

Coleção `configuracoes` (documento `app`) guarda ajuda, contato, versão,
instrumento padrão e equipamento — equivalentes ao `AJUDA.DBF`.

### Onde ficam as partituras (PDF)

Cada PDF mora em um **subdocumento** da própria música:

```
musicas/vfp-001                  → { musica: "Smile", autor: "...", ... }
musicas/vfp-001/partitura/atual  → { nome: "Smile - Teclado.pdf", dados: "<base64>" }
```

Por que assim:

- **Sem Cloud Storage** → desde 03/02/2026 ele exige o plano Blaze (cartão de
  crédito). O Firestore no plano gratuito (Spark) não exige nada.
- **Em subdocumento separado** → o catálogo (`listar()`) lê só a coleção
  principal; as partituras só são baixadas quando você abre uma música.
- **Limite de tamanho**: o Firestore aceita 1 MiB por documento e o base64
  cresce ~33% → **PDF de até 700 KB**. As 17 partituras do app antigo cabem
  todas (a maior tem 489 KB); o "Real Book I.pdf" (26 MB) precisaria ser
  dividido em partes.

---

## 7. Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm start` | build de produção / servidor standalone |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run import:vfp -- --dry-run` | prévia da importação do VFP |
| `npm run import:vfp -- --local` | importa para `.data/` |
| `npm run import:vfp` | importa para o Firebase |
| `npm run config:env -- <chave.json>` | gera o `.env.local` a partir da Service Account |
| `npm run regras` | publica as regras `deny all` no Firestore (pela API, sem CLI) |

---

## 8. Decisões técnicas

**Por que Next.js e não um app nativo?** A mesma base serve celular, tablet e
computador; a PWA dá "instalar na tela de início" com ícone próprio e funciona
sem loja de aplicativos. O custo é não ter acesso ao hardware específico — o
que, para este app, não faz falta (a partitura é PDF e o resto é texto).

**Por que o PDF.js no lugar do controle ActiveX do VFP?** O WindowsCE/ActiveX
`Shell.Explorer.2` só existia no Internet Explorer do Windows. No navegador o
equivalente é o pdf.js, que ainda permite algo que o app antigo não tinha:
rolagem contínua com velocidade ajustável entre as páginas.

**Por que Firestore em vez de um banco relacional?** O catálogo é uma lista de
músicas com poucos campos e consulta por texto — o modelo de documento do
Firestore atende melhor. E, desde 03/02/2026, o Cloud Storage do Firebase exige
o plano pago (Blaze, com cartão); guardar os PDFs dentro do Firestore mantém o
projeto no **plano gratuito, sem cartão** — que é o ponto.

**Por que a API no servidor em vez do SDK Web no navegador?** Mantém as regras
do Firestore em `deny all` para o cliente: nenhuma chave do Firebase é exposta
no bundle e o acesso só acontece pelo backend. O custo é uma camada de API —
que também centraliza validação (zod) e upload.


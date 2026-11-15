# Publicando na nuvem — Vercel + Firebase

Guia passo a passo para sair do `npm run dev` e ter o app funcionando no
celular de qualquer lugar.

```
   Celular / Tablet / Notebook
            │  HTTPS
            ▼
   ┌─────────────────────────┐
   │  Vercel (Next.js 16)    │  route handlers (API)
   │  • render das telas      │  • CRUD no Firestore
   │  • PDF.js (react-pdf)    │  • upload/serve do PDF (base64)
   └───────────┬─────────────┘
               │  Admin SDK (chave de service account)
               ▼
   ┌─────────────────────────┐
   │  Firebase               │
   │  • Firestore  musicas   │
   │  • musicas/{id}/partitura│
   └─────────────────────────┘
```

**Nenhuma chave do Firebase vai para o navegador.** O SDK Admin roda no servidor
e ignora as regras do Firestore — por isso as regras podem ser `deny all`
para clientes.

> 💡 **Sem Cloud Storage, sem cartão de crédito.** Desde 03/02/2026 o Cloud
> Storage do Firebase exige o plano pago (Blaze). Aqui os PDFs ficam dentro do
> Firestore (base64, em subdocumento), então o **plano gratuito (Spark) basta**
> e não é preciso cadastrar cartão.

---

## Passo 1 — Criar o projeto Firebase (independente)

1. <https://console.firebase.google.com> → **Adicionar projeto**.
   Dê um nome próprio, por exemplo `pasta-de-musicas-ivan`.
   *Google Analytics*: **desligado** (não usamos).
2. **Bancos de dados e armazenamento → Firestore** → *Criar banco de dados*:
   - Edição: **Standard**
   - Local: `southamerica-east1` (São Paulo)
   - Modo: **Produção**
   > ⚠️ Se aparecer um aviso sobre o plano **Blaze** e *backups*, pode ignorar:
   > é só sobre backups. O Firestore funciona no plano gratuito.
3. **Contas de serviço** → crie/abra a conta do servidor → aba **"Chaves"** →
   **Gerar nova chave privada** (JSON). Ele contém:

   ```json
   {
     "project_id": "pasta-de-musicas-ivan",
     "client_email": "firebase-adminsdk-xxxxx@pasta-de-musicas-ivan.iam.gserviceaccount.com",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   }
   ```

   > **Não crie bucket no Storage** — os PDFs ficam no Firestore (plano gratuito).

### Variáveis de ambiente

```bash
FIREBASE_PROJECT_ID=pasta-de-musicas-ivan
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@pasta-de-musicas-ivan.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> A `PRIVATE_KEY` precisa ficar **em uma linha só**, com os `\n` literais
> (é assim que a Vercel e o `.env` guardam). O código troca `\n` por quebra
> de linha real ao carregar.
>
> **Atalho:** em vez de copiar e colar, use o script — ele lê o JSON baixado
> do console e escreve o `.env.local` já escapado:
>
> ```bash
> npm run config:env -- ~/Downloads/pasta-de-musicas-ivan-xxxxx.json
> ```

---

## Passo 2 — Publicar na Vercel

1. Suba o projeto para o GitHub (ou GitLab/Bitbucket).
2. Em <https://vercel.com> → **Add New → Project** → importe o repositório.
   A Vercel detecta o Next.js sozinha (preset *Next.js*, build `npm run build`).
3. Em **Settings → Environment Variables**, cadastre as variáveis acima para
   *Production*, *Preview* e *Development*.
4. **Deploy**.

Pronto — o app já está no ar (ex.: `https://pasta-de-musicas-ivan.vercel.app`).

### Build local igual ao da Vercel

```bash
npm run typecheck && npm run lint && npm run build
```

---

## Passo 3 — Publicar as regras do Firestore

As regras são publicadas **pela API do Google**, usando a própria Service
Account — sem `firebase login` e sem a CLI:

```bash
npm run regras
```

O script (`scripts/publicar-regras.mjs`) gera um access token (JWT RS256) com
a chave privada e publica o `firestore.rules` como uma *release* do Firestore.

> Se preferir a CLI (útil para `firebase emulators` ou para inspecionar o
> projeto): `firebase login` → `firebase use --add` → `npm run firebase:deploy`.
> Não é obrigatório.

As regras publicadas são `deny all` para o cliente: só o servidor (Admin SDK)
acessa os dados.

---

## Passo 4 — Importar as músicas do app antigo

Rode **na sua máquina** (precisa das credenciais no `.env.local`):

```bash
cp .env.example .env.local         # ou: npm run config:env -- ~/Downloads/chave.json
npm run import:vfp -- --dry-run    # confere o que será importado
npm run import:vfp                 # grava no Firestore
```

O importador lê `músicas.DBF`/`AJUDA.DBF` do Visual FoxPro, casa cada registro
com o PDF da pasta `PDF/` e cria os documentos em `musicas/vfp-001`, `vfp-002`…
O PDF vai para `musicas/{id}/partitura/atual` (base64).

> Partituras acima de **700 KB** são ignoradas com aviso (limite do Firestore).
> As 17 do app antigo cabem todas — a maior tem 489 KB.

Para mudar a origem dos dados:

```bash
LEGACY_VFP_DIR="/caminho/Músicas_Demo_copia" npm run import:vfp
```

---

## Passo 5 — Usar no celular

1. Abra o endereço do app no navegador do celular.
2. **Android/Chrome**: menu ⋮ → *Instalar app* (ou o banner “Instale o app”).
3. **iPhone/Safari**: *Compartilhar* → *Adicionar à Tela de Início*.
4. O app abre em tela cheia, com ícone próprio e a tela ligada durante a
   rolagem automática da partitura.

---

## Alternativa: servidor próprio (VPS + Docker + Caddy)

Se preferir não usar a Vercel:

```bash
docker build -t pasta-musicas .
docker run -d --name pasta-musicas \
  -p 3000:3000 \
  -e FIREBASE_PROJECT_ID=... \
  -e FIREBASE_CLIENT_EMAIL=... \
  -e FIREBASE_PRIVATE_KEY="..." \
  -v partituras:/app/.data \
  pasta-musicas
```

E no Caddy:

```
musicas.seudominio.com {
    reverse_proxy localhost:3000
    encode gzip
}
```

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

> O `output: 'standalone'` do `next.config.ts` já existe para esse caso.

---

## Custos e limites (plano gratuito — Spark, sem cartão)

| Recurso | Limite grátis |
| --- | --- |
| Firestore | 50.000 leituras/dia · 40.000 escritas/dia · 1 GB |
| Partitura PDF | **até 700 KB** por música (1 MiB por documento ÷ base64) |
| Vercel | 100 GB de banda/mês · funções serverless com limite de execução |

Para um|scale| de um músico (centenas de partituras), o consumo é irrelevante
no plano gratuito. Se o app crescer para milhares de usuários simultâneos,
o gargalo será a taxa de leitura do Firestore — aí compensa paging e cache.

📌 **Leitura de PDF conta como read units**: o Firestore cobra por 4 KiB lidos,
então uma partitura de 300 KB consome ~75 read units a cada abertura. Com a
cota de 50.000/dia, dá para abrir a partitura ~600 vezes por dia.

---

## Checklist

- [ ] Projeto Firebase criado (**só Firestore**, sem Storage)
- [ ] Firestore: Standard · `southamerica-east1` · modo **Produção**
- [ ] Service Account gerada e as 3 variáveis configuradas na Vercel
- [ ] `npm run build` passou local
- [ ] Deploy feito na Vercel
- [ ] `npm run regras` executado (regras deny-all publicadas)
- [ ] `npm run import:vfp` executado (17 músicas conferidas no catálogo)
- [ ] Uma partitura aberta e testada com rolagem automática
- [ ] App instalado na tela de início do celular

---

## Problemas comuns

**“Firebase Admin não configurado”**
Faltou uma das variáveis. No Vercel, confirme que `FIREBASE_PRIVATE_KEY` está
com aspas e com `\n` literais.

**A partitura não abre (erro de PDF)**
O arquivo não chegou ao Firestore. Rode de novo `npm run import:vfp` e confira em
*Firebase Console → Firestore → musicas → vfp-001 → partitura → atual*.

**A rolagem automática não funciona no iPhone**
O iOS exige que o `AudioContext`/movimento partam de um toque do usuário —
no player, o botão *Rolar* é o gatilho. Também é preciso “desbloquear” o
som do navegador tocando uma vez na tela.

**Upload falha com 413**
PDF acima de 700 KB (limite do Firestore). Reduza o tamanho: no scanner/impressora,
use qualidade menor; no Scanner do iPhone, "PDF" com tamanho reduzido; ou
divida o Real Book em partes menores.

**“O projeto está no Spark e o Storage dá 402/403”**
Esperado: o Cloud Storage exige o plano Blaze. Não usamos Storage — os PDFs
ficam no Firestore.

**Quero testar sem Firebase**
Use `REPOSITORY=local npm run dev` — o app usa a pasta `.data/`.

# Adaptações para celular, tablet e desktop

Este documento registra **todas** as decisões de layout do app, para que
qualquer mudança futura mantenha o mesmo comportamento nos três formatos.

---

## 1. Os três formatos e os breakpoints

| Formato | Largura | Breakpoint Tailwind | O que aparece |
| --- | --- | --- | --- |
| **Celular** | < 640 px | base | 1 coluna de cartões · navegação só por ícone · filtros em *bottom sheet* |
| **Tablet (retrato)** | 640–1023 px | `sm:` | **2 colunas de cartões** · navegação com rótulo · filtros em *bottom sheet* |
| **Tablet (paisagem) / desktop** | ≥ 1024 px | `lg:` | **Tabela** completa · filtros em linha · navegação com rótulo |
| **Desktop amplo** | ≥ 1280 px | `xl:` | Tabela com 4 filtros numa linha · conteúdo até `max-w-6xl` |

### Por que a tabela só aparece a partir de 1024 px

A tabela original aparecia a partir de 768 px (`md:`). Em um **iPad deitado
(portrait, 820–834 pt)** isso deixava 7 colunas espremidas: "Choro-001" quebrava
em duas linhas, "Sérgio Bitencourt" virava três. A tabela passou a ser
**exclusiva de telas grandes** (`lg:`), e o intervalo de tablet ganhou um
**grid de 2 colunas** — que é o que a pessoa realmente quer nesse formato
(ver mais partituras por vez, sem tabela espremida).

---

## 2. Por tela

### 2.1 Catálogo (`/`)

| Elemento | Celular | Tablet | Desktop |
| --- | --- | --- | --- |
| Busca | ocupa a largura, ícone de microfone à direita | idem | idem |
| Filtros | botão → *bottom sheet* | botão → *bottom sheet* | 4 selects em linha (`lg:`) |
| Ordenação | select compacto (ícone + rótulo curto) | idem | idem |
| Lista | 1 coluna de cartões | **2 colunas** (`sm:grid-cols-2`) | tabela |
| Agrupamento | por SetList com linha colorida | idem | linha de grupo dentro da tabela |

- **Ícone por instrumento** (`src/lib/aparencia.ts`): "Teclado" → piano,
  "Baixo" → disco, "Trumpete" → nota musical, "Cifra" → partitura,
  "Letra" → linha de áudio. É o mesmo texto livre do app VFP
  ("Partituras - Teclado", "Letra & Cifra") que agora ganha um ícone e uma cor.
- **Cor por SetList**: derivada do nome do grupo (`corDoGrupo`) — o mesmo
  repertório sempre aparece na mesma cor, o que ajuda a memorizar a sequência.
- **Busca por voz**: botão de microfone ao lado da busca (Web Speech API,
  `pt-BR`). É um item do documento original do projeto ("Pesquisa por voz").
  Em navegadores sem suporte, mostra um aviso e não quebra nada.

### 2.2 Player (`/musica/[id]`)

- Tela cheia: o cabeçalho do site some (`Cabecalho` retorna `null` em
  `/musica/*`) e o player ocupa 100% da altura (`h-dvh`).
- **Barra de controles em uma faixa no celular** e com folga a partir de
  `sm:` — o slider de velocidade ganha largura (`w-14` → `w-24` → `w-28`) em
  vez de espremer os botões.
- **Posição no SetList** ("G-005 · 3 de 8") aparece a partir de `sm:`.
- Alvos de toque de 40–48 px em todos os botões.
- `pb-safe` (env safe-area-inset-bottom) para o botão home do iPhone não
  cobrir a barra de controles.

### 2.3 Manutenção (`/manutencao`)

- Lista em **2 colunas no tablet** (`sm:grid-cols-2`).
- O nome da música é um link para o player no celular; no desktop vira texto
  (o botão ▶ já faz o mesmo).
- Ícone do instrumento à esquerda de cada linha, como no catálogo.
- Arrastar para reordenar (dnd-kit) no desktop; **↑ ↓** em todas as telas
  (é o caminho real no celular, onde arrastar é impreciso).

### 2.4 Ajuda (`/ajuda`)

- Abas "Sobre / Afinador / Metrônomo" empilham no celular e ficam em linha no
  desktop.
- Seletor de equipamento (Micro / Tablet / Celular) salva a preferência no
  `localStorage` do dispositivo.

### 2.5 Login (`/entrar`)

- Layout de coluna, cartão centralizado, largura máxima `max-w-sm`.
- Ícones dentro dos campos (e-mail, cadeado, pessoa) e botão de mostrar
  senha.
- Fundo com dois brilhos suaves em `primary` (opacidade 7%) — dá a
  "sensação de palco" sem pesar.

---

## 3. Regras gerais aplicadas

1. **Alvos de toque ≥ 40 px** (`size-9`, `size-10`, `h-10`, `h-11`).
2. **Áreas seguras do iPhone**: `pt-safe` no cabeçalho, `pb-safe` na barra de
   controles e no rodapé das listas (`env(safe-area-inset-*)`).
3. **`viewport-fit=cover`** no `<head>` — obrigatório para a área segura
   funcionar no iOS.
4. **Sem rolagem horizontal**: todo container tem `min-w-0` onde há texto
   variável + `truncate`.
5. **`overscroll-contain`** na área da partitura: no celular, arrastar a
   partitura não "puxa" a página atrás.
6. **`touch-none` nos punhos de arrastar** (dnd-kit) — sem isso o scroll da
   página briga com o arrasto.
7. **Fontes fluidas**: `text-[13px]` no título do cabeçalho no celular
   (economiza ~30 px para os 4 botões da navegação).
8. **`tabular-nums`** nos números (ordem, velocidade, zoom, páginas) — eles
   não "pulsam" ao mudar.

---

## 4. PWA (instalar no celular)

- `public/manifest.webmanifest` — nome, ícone, cores, atalhos para
  Catálogo / Manutenção / Ajuda.
- `public/sw.js` — service worker:
  - navegação → rede primeiro, cache como reserva (app abre offline);
  - `/_next/static/` → cache primeiro (imutáveis);
  - **PDFs → rede primeiro com cache**: a partitura que você já tocou continua
    disponível sem internet.
- Ícones em `public/icons/` (192, 512, maskable, apple-touch-icon).
- `appleWebApp` + `apple-touch-icon` no layout → tela cheia no iPhone.

---

## 5. Como testar cada formato

| Formato | Como testar |
| --- | --- |
| Celular | DevTools → *Device toolbar* (375×667) ou um iPhone real na mesma rede |
| Tablet retrato | DevTools → 820×1180 (iPad Air/Pro 11") |
| Tablet paisagem | DevTools → 1194×834 |
| Desktop | DevTools → 1440×900 |

**Atalho no iPad/iPhone:** abra `http://SEU-IP:3000` no Safari do aparelho.
O Next.js mostra o IP da rede no terminal ao iniciar.

---

## 6. Checklist ao mexer no layout

- [ ] Testei em 390 px (celular), 820 px (tablet retrato) e 1280 px (desktop)
- [ ] Os alvos de toque continuam com 40 px ou mais
- [ ] Não apareceu rolagem horizontal
- [ ] O texto não vaza do container (`truncate` + `min-w-0`)
- [ ] As áreas seguras do iPhone estão respeitadas (`pt-safe` / `pb-safe`)
- [ ] Continua funcionando com o teclado na tela (inputs não somem)

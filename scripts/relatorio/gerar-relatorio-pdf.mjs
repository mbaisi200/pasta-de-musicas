#!/usr/bin/env node
/**
 * Gera o relatório de linguagens em PDF (Next.js/PDFKit).
 *
 * Pré-requisitos:
 *   npm install --save-dev pdfkit
 *
 * Uso:
 *   python3 scripts/relatorio/coleta-linguagens.py
 *   node scripts/relatorio/gerar-relatorio-pdf.mjs
 *
 * Saída: relatorio-linguagens-projeto.pdf na raiz do projeto.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.join(HERE, '..', '..'));
const DATA = path.join(HERE, 'dados.json');
const OUT = path.join(ROOT, 'relatorio-linguagens-projeto.pdf');
const PKG = path.join(ROOT, 'package.json');

const FONT_DIR = '/usr/share/fonts/dejavu';
const FONT_REG = path.join(FONT_DIR, 'DejaVuSans.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'DejaVuSans-Bold.ttf');
const FONT_MONO = path.join(FONT_DIR, 'DejaVuSansMono.ttf');

const C = {
  ink: '#1c1917', ink2: '#44403c', muted: '#78716c', faint: '#a8a29e',
  line: '#e8e6e1', panel: '#f5f4f1', purple: '#7c3aed', purpleL: '#ede9fe',
  amber: '#f59e0b', teal: '#0d9488', white: '#ffffff',
};

const PW = 595.28, PH = 841.89, M = 45, CW = PW - M * 2;
const TOP = M, BOTTOM = PH - M - 18;

const PT = (n, d = 2) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

const PALETTE = {
  'TypeScript / JSX': '#7c3aed', TypeScript: '#a78bfa',
  'JavaScript (ESM)': '#eab308', JavaScript: '#eab308',
  'Firestore Rules': '#0d9488', CSS: '#f59e0b', Markdown: '#64748b',
  JSON: '#94a3b8', Shell: '#16a34a', 'SVG / XML': '#e11d48',
  'Web App Manifest': '#0ea5e9', SQL: '#0d9488',
};

if (!fs.existsSync(DATA)) {
  console.error('dados.json ausente. Rode antes: python3 scripts/relatorio/coleta-linguagens.py');
  process.exit(1);
}
const D = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));

const dep = (name) => (pkg.dependencies?.[name] || pkg.devDependencies?.[name] || '—').replace('^', '');
const stack = [
  ['Next.js', dep('next')],
  ['React', dep('react')],
  ['TypeScript', dep('typescript')],
  ['Tailwind CSS', dep('tailwindcss')],
  ['Firebase', dep('firebase')],
  ['Firebase Admin', dep('firebase-admin')],
  ['react-pdf', dep('react-pdf')],
  ['Zod', dep('zod')],
  ['Radix UI', dep('@radix-ui/react-dialog')],
  ['lucide-react', dep('lucide-react')],
  ['sonner', dep('sonner')],
  ['dnd-kit', dep('@dnd-kit/core')],
  ['Vercel', 'deploy'],
  ['PWA', 'service worker + manifest'],
];

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: M, bottom: M, left: M, right: M },
  bufferPages: true,
  info: {
    Title: 'Relatorio de Linguagens - Pasta de Musicas',
    Author: 'Analise estatica de codigo-fonte',
    Subject: 'Distribuicao percentual de linguagens do projeto',
    Keywords: 'linguagens, nextjs, typescript, pwa, firebase, relatorio',
  },
});
doc.registerFont('reg', FONT_REG);
doc.registerFont('bold', FONT_BOLD);
if (fs.existsSync(FONT_MONO)) doc.registerFont('mono', FONT_MONO);

let y = 0;
const ensure = (space) => {
  if (y + space > BOTTOM) { doc.addPage(); y = TOP; }
  return y;
};

function headerCapa() {
  doc.rect(0, 0, PW, 26).fill(C.ink);
  doc.rect(0, 26, PW, 3).fill(C.purple);
  const ms = 46;
  doc.roundedRect(M, 60, ms, ms, 10).fill(C.purple);
  doc.fillColor(C.white).font(FONT_BOLD).fontSize(22)
    .text('♪', M, 60 + ms / 2 - 11, { width: ms, align: 'center' });
  doc.fillColor(C.ink).font(FONT_BOLD).fontSize(21)
    .text('Relatório de Linguagens', M + 58, 60, { width: CW - 58 });
  doc.fillColor(C.muted).font(FONT_REG).fontSize(10.5)
    .text('Pasta de Músicas  ·  catálogo e player de partituras (web + PWA)',
      M + 58, 87, { width: CW - 58 });
  doc.fillColor(C.ink2).font(FONT_REG).fontSize(8.6)
    .text(`Projeto: ${ROOT}\nGerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}  ·  análise estática de código-fonte`,
      M + 58, 105, { width: CW - 58, lineGap: 2 });
  y = 166;
}

function sectionTitle(num, title, sub) {
  ensure(62);
  doc.fillColor(C.purple).font(FONT_BOLD).fontSize(8.5)
    .text(String(num).padStart(2, '0'), M, y, { width: 26 });
  doc.fillColor(C.ink).font(FONT_BOLD).fontSize(13)
    .text(title, M + 30, y - 2, { width: CW - 30 });
  let yy = y + 15;
  if (sub) {
    doc.fillColor(C.muted).font(FONT_REG).fontSize(8.6)
      .text(sub, M + 30, yy, { width: CW - 30, lineGap: 1 });
    yy += 13;
  }
  doc.strokeColor(C.line).lineWidth(1).moveTo(M, yy).lineTo(M + CW, yy).stroke();
  y = yy + 14;
}

function kpiRow(items) {
  ensure(82);
  const kw = (CW - 3 * 12) / 4;
  items.forEach((it, i) => {
    const x = M + i * (kw + 12);
    doc.roundedRect(x, y, kw, 74, 8).fill(C.panel);
    doc.roundedRect(x, y, 4, 74, 2).fill(it.color);
    doc.fillColor(C.muted).font(FONT_BOLD).fontSize(7.2)
      .text(it.label.toUpperCase(), x + 14, y + 11, { width: kw - 24, characterSpacing: 0.7 });
    doc.fillColor(C.ink).font(FONT_BOLD).fontSize(18)
      .text(it.value, x + 14, y + 23, { width: kw - 24 });
    doc.fillColor(C.muted).font(FONT_REG).fontSize(7.6)
      .text(it.sub, x + 14, y + 47, { width: kw - 24, lineGap: 1.5 });
  });
  y += 74 + 16;
}

function stackedBar(entries, total) {
  const h = 24;
  ensure(h + 34);
  let cx = M;
  entries.forEach((e) => {
    const seg = (e.lines / total) * CW;
    doc.rect(cx, y, seg, h).fill(PALETTE[e.lang] || C.muted);
    cx += seg;
  });
  doc.rect(M, y, CW, h).lineWidth(0.6).strokeColor(C.line).stroke();
  y += h + 10;

  doc.font(FONT_REG).fontSize(7.4);
  let lx = M, ly = y;
  entries.forEach((e) => {
    if (e.lines / total <= 0.015) return;
    const label = `${e.lang}  ${PT((e.lines / total) * 100)}%`;
    const wNeeded = doc.widthOfString(label) + 16;
    if (lx + wNeeded > M + CW) { lx = M; ly += 12; }
    doc.circle(lx + 3, ly + 3.4, 3).fill(PALETTE[e.lang] || C.muted);
    doc.fillColor(C.ink2).text(label, lx + 10, ly, { width: wNeeded, lineBreak: false });
    lx += wNeeded + 10;
  });
  y = ly + 12;
}

function tableHeader(cols) {
  doc.rect(M, y, CW, 20).fill(C.ink);
  doc.font(FONT_BOLD).fontSize(7.4).fillColor(C.white);
  cols.forEach((c) => {
    doc.text(c.label.toUpperCase(), c.x + (c.align === 'right' ? -c.w : 0), y + 7,
      { width: c.w, align: c.align || 'left', characterSpacing: 0.5 });
  });
  y += 20;
}

function tableRow(cols, cells, zebra, barKey, rowH = 22) {
  const h = rowH;
  if (zebra) doc.rect(M, y, CW, h).fill(C.panel);
  cols.forEach((c, i) => {
    const cell = cells[i];
    if (barKey && barKey === c.key) {
      const bw = Math.max((cell.pct / 100) * c.w, 2);
      doc.roundedRect(c.x, y + 7, bw, 8, 2.5).fill(PALETTE[cell.lang] || C.purple);
    } else if (cell.dot) {
      doc.circle(c.x + 4, y + 11, 3).fill(cell.dot);
      doc.fillColor(C.ink2).font(FONT_REG).fontSize(8.6)
        .text(cell.text, c.x + 13, y + 6.5, { width: c.w - 13, ellipsis: true, lineBreak: false });
    } else {
      doc.fillColor(c.bold ? C.ink : C.ink2).font(c.bold ? FONT_BOLD : FONT_REG).fontSize(8.6)
        .text(cell.text, c.x + (c.align === 'right' ? -c.w : 0), y + 6.5,
          { width: c.w, align: c.align || 'left', ellipsis: true, lineBreak: false });
    }
  });
  doc.strokeColor(C.line).lineWidth(0.5).moveTo(M, y + h).lineTo(M + CW, y + h).stroke();
  y += h;
}

/** Lista com título em negrito e descrição em regular, medindo a altura real. */
function richList(entries, x, w) {
  entries.forEach((e) => {
    doc.circle(x + 4, y + 5.5, 2.8).fill(C.purple);
    const total = e.parts.map((p) => p.text).join('');
    const h = doc.font(FONT_REG).fontSize(8.6).heightOfString(total, { width: w - 16, lineGap: 1 });
    doc.font(FONT_BOLD).fillColor(C.ink).fontSize(8.6)
      .text(e.parts[0].text, x + 14, y, { width: w - 16, continued: true, lineGap: 1 });
    e.parts.slice(1).forEach((p, i, arr) => {
      const last = i === arr.length - 1;
      doc.font(p.bold ? FONT_BOLD : FONT_REG).fillColor(p.color || C.ink2).fontSize(8.6)
        .text(p.text, { width: w - 16, continued: !last, lineGap: 1 });
    });
    y += h + 7;
  });
}

// ---------------------------------------------------------------- dados
const stats = D.stats;
const totalLines = Object.values(stats).reduce((s, v) => s + v.lines, 0);
const totalFiles = Object.values(stats).reduce((s, v) => s + v.files, 0);
const CODE_LANGS = ['TypeScript / JSX', 'TypeScript', 'JavaScript (ESM)', 'JavaScript'];
const codeStats = Object.fromEntries(Object.entries(stats).filter(([k]) => CODE_LANGS.includes(k)));
const codeLines = Object.values(codeStats).reduce((s, v) => s + v.lines, 0);
const codeFiles = Object.values(codeStats).reduce((s, v) => s + v.files, 0);
const tsPct = ((stats['TypeScript / JSX'].lines + stats.TypeScript.lines) / codeLines) * 100;

const entries = Object.entries(stats).map(([lang, v]) => ({ lang, ...v })).sort((a, b) => b.lines - a.lines);
const aEntries = Object.entries(codeStats).map(([lang, v]) => ({ lang, ...v })).sort((a, b) => b.lines - a.lines);

const COLS = [
  { key: 'lang', label: 'Linguagem / formato', x: M + 10, w: 160 },
  { key: 'files', label: 'Arquivos', x: M + 184, w: 54, align: 'right' },
  { key: 'lines', label: 'Linhas', x: M + 246, w: 58, align: 'right' },
  { key: 'pct', label: '% total', x: M + 316, w: 50, align: 'right' },
  { key: 'bar', label: 'Distribuição', x: M + 378, w: 120 },
];

// ---------------------------------------------------------------- conteúdo
headerCapa();

kpiRow([
  { label: 'Linhas de código', value: PT(totalLines, 0), sub: `em ${totalFiles} arquivos versionados`, color: C.purple },
  { label: 'Código do app', value: PT(codeLines, 0), sub: `em ${codeFiles} arquivos`, color: C.teal },
  { label: 'TypeScript', value: `${PT(tsPct)}%`, sub: 'do código de aplicação', color: '#2563eb' },
  { label: 'Stack', value: 'Next 16', sub: 'React 19 · Firebase · PWA', color: C.amber },
]);

// 01
sectionTitle(1, 'Resumo executivo', 'Leitura resumida da análise estática do código-fonte.');
const resumo =
  `A Pasta de Músicas é a versão web e mobile (PWA) do app que roda em Visual FoxPro 9 no ` +
  `desktop: catálogo de partituras com player de PDF, rolagem automática, SetList, afinador e ` +
  `metrônomo. São ${totalFiles} arquivos e ${PT(totalLines, 0)} linhas, dos quais ` +
  `${PT(codeLines, 0)} são código de aplicação (TypeScript e JavaScript) — ${PT(tsPct)}% em ` +
  `TypeScript. O front-end usa Next.js 16 com App Router e Tailwind CSS 4; os dados e os PDFs ` +
  `das partituras ficam no Firestore, acessados só pelo servidor. O player usa react-pdf ` +
  `(pdf.js), o áudio usa a Web Audio API e o app é instalável, com service worker e offline.`;
ensure(96);
doc.font(FONT_REG).fontSize(9);
const resumoH = doc.heightOfString(resumo, { width: CW - 36, lineGap: 3 }) + 24;
doc.roundedRect(M, y, CW, resumoH, 6).fill(C.panel);
doc.rect(M, y, 4, resumoH).fill(C.purple);
doc.fillColor(C.ink2).font(FONT_REG).fontSize(9).text(resumo, M + 18, y + 14,
  { width: CW - 36, lineGap: 3 });
y += resumoH + 16;

// 02
ensure(340);
sectionTitle(2, 'Visão geral por linguagem',
  'Todas as linguagens e formatos presentes no diretório do projeto, por volume de linhas de código.');
stackedBar(entries, totalLines);
ensure(20 + entries.length * 20 + 20);
tableHeader(COLS);
entries.forEach((e, i) => {
  tableRow(COLS, [
    { text: e.lang }, { text: PT(e.files, 0) }, { text: PT(e.lines, 0) },
    { text: `${PT((e.lines / totalLines) * 100)}%` },
    { pct: (e.lines / totalLines) * 100, lang: e.lang },
  ], i % 2 === 1, 'bar', 20);
});
tableRow(COLS, [
  { text: 'Total' }, { text: PT(totalFiles, 0) }, { text: PT(totalLines, 0) },
  { text: '100,00%' }, { pct: 100, lang: 'TypeScript / JSX' },
], false, 'bar', 20);
y += 20;

// 03
ensure(360);
sectionTitle(3, 'Código de aplicação',
  'TypeScript e JavaScript do produto (front-end, route handlers e scripts), sem artefatos gerados.');
stackedBar(aEntries, codeLines);
ensure(20 + aEntries.length * 20 + 60);
tableHeader(COLS);
aEntries.forEach((e, i) => {
  tableRow(COLS, [
    { text: e.lang }, { text: PT(e.files, 0) }, { text: PT(e.lines, 0) },
    { text: `${PT((e.lines / codeLines) * 100)}%` },
    { pct: (e.lines / codeLines) * 100, lang: e.lang },
  ], i % 2 === 1, 'bar', 20);
});
y += 14;
const conclusao =
  `O projeto é ${PT(tsPct)}% TypeScript (TSX + TS), com type-checking estrito e zero JavaScript ` +
  `compilado no front-end. Fora do código de aplicação entram ${PT(stats.CSS.lines, 0)} linhas ` +
  `de CSS (${PT((stats.CSS.lines / totalLines) * 100)}% do projeto), ` +
  `${PT(stats.Markdown.lines, 0)} de documentação, e o resto são configurações de build, ` +
  `regras do Firestore e o manifest do PWA.`;
doc.font(FONT_REG).fontSize(9);
const conclH = doc.heightOfString(conclusao, { width: CW - 28, lineGap: 2 });
const conclBoxH = 24 + conclH + 14;
ensure(conclBoxH);
doc.roundedRect(M, y, CW, conclBoxH, 6).fill(C.purpleL);
doc.fillColor(C.purple).font(FONT_BOLD).fontSize(8.6)
  .text('CONCLUSÃO', M + 14, y + 11, { width: CW - 28, characterSpacing: 0.6 });
doc.fillColor(C.ink2).font(FONT_REG).fontSize(9)
  .text(conclusao, M + 14, y + 24, { width: CW - 28, lineGap: 2 });
y += conclBoxH + 26;

// 04
ensure(150);
sectionTitle(4, 'Distribuição interna por área',
  'Peso de cada área do projeto (diretórios e arquivos avulsos), por volume de linhas de código.');
const allAreas = Object.entries(D.areas).sort((a, b) => b[1].lines - a[1].lines);
const TOP_N = 14;
const areas = allAreas.slice(0, TOP_N);
const rest = allAreas.slice(TOP_N);
if (rest.length) {
  areas.push([`demais ${rest.length} áreas`, {
    lines: rest.reduce((s, a) => s + a[1].lines, 0),
    files: rest.reduce((s, a) => s + a[1].files, 0),
  }]);
}
const aMax = Math.max(...areas.map((a) => a[1].lines));
const aTotal = allAreas.reduce((s, a) => s + a[1].lines, 0);
areas.forEach((a, i) => {
  ensure(21);
  const [name, v] = a;
  if (i % 2 === 0) doc.rect(M, y, CW, 21).fill(C.panel);
  doc.fillColor(C.ink).font(i < 4 ? FONT_BOLD : FONT_REG).fontSize(8.4)
    .text(name, M + 10, y + 6.5, { width: 140, ellipsis: true, lineBreak: false });
  const bx = M + 158, bw = 205;
  const barW = Math.max((v.lines / aMax) * bw, 3);
  doc.roundedRect(bx, y + 7, barW, 7, 2.5).fill(C.purple);
  doc.fillColor(C.ink2).font(FONT_REG).fontSize(8.2)
    .text(`${PT(v.lines, 0)} linhas`, bx + bw + 8, y + 6,
      { width: 70, lineBreak: false });
  doc.fillColor(C.muted).font(FONT_REG).fontSize(8)
    .text(`${PT((v.lines / aTotal) * 100)}%`, M + CW - 44, y + 6,
      { width: 40, align: 'right', lineBreak: false });
  doc.strokeColor(C.line).lineWidth(0.5).moveTo(M, y + 21).lineTo(M + CW, y + 21).stroke();
  y += 21;
});
y += 24;

// 05
ensure(346);
sectionTitle(5, 'Arquivos com maior densidade',
  'Top 12 arquivos por número de linhas — pontos de maior complexidade e momento de revisão.');
const top = D.top.slice(0, 12);
ensure(20 + top.length * 22);
const TCOLS = [
  { key: 'f', label: 'Arquivo', x: M + 10, w: 295 },
  { key: 'l', label: 'Linguagem', x: M + 315, w: 120 },
  { key: 'n', label: 'Linhas', x: M + 448, w: 47, align: 'right' },
];
tableHeader(TCOLS);
top.forEach((t, i) => {
  tableRow(TCOLS, [
    { text: t[0] }, { text: t[1] }, { text: PT(t[2], 0) },
  ], i % 2 === 1);
});
y += 24;

// 06
ensure(200);
sectionTitle(6, 'Stack technological',
  'Dependências declaradas no package.json do projeto.');
const colW = (CW - 16) / 2;
const half = Math.ceil(stack.length / 2);
const blocks = [['Dependências de runtime', stack.slice(0, half)],
                ['Plataforma e ferramentas', stack.slice(half)]];
ensure(26 + half * 17);
blocks.forEach((blk, bi) => {
  const bx = M + bi * (colW + 16);
  doc.roundedRect(bx, y, colW, 26 + blk[1].length * 17, 6).fill(C.panel);
  doc.fillColor(C.purple).font(FONT_BOLD).fontSize(7.6)
    .text(blk[0].toUpperCase(), bx + 14, y + 10, { width: colW - 28, characterSpacing: 0.6 });
  blk[1].forEach((s, i) => {
    const ry = y + 26 + i * 17;
    doc.fillColor(C.ink).font(FONT_REG).fontSize(8.4)
      .text(s[0], bx + 14, ry, { width: colW - 110, lineBreak: false });
    doc.fillColor(C.muted).font(FONT_REG).fontSize(8)
      .text(s[1], bx + 14, ry, { width: colW - 28, align: 'right', lineBreak: false });
  });
});
y += 26 + half * 17 + 24;

// 07 — o backend hoje
ensure(320);
sectionTitle(7, 'O backend hoje',
  'Superfície de API, camada de dados, sessão e scripts de operação.');
const be = D.backend || {};
const beRows = [
  ['Route handlers (API)', 'src/app/api/**/route.ts', 'Route handlers (API)'],
  ['Camada de repositório', 'src/lib/repositorio/', 'Camada de repositório'],
  ['Firebase (admin, contas, diagnóstico)', 'src/lib/firebase/', 'Firebase (admin, contas, diagnóstico)'],
  ['Sessão e papéis (session cookie)', 'src/lib/sessao.ts', 'Sessão e papéis'],
];
const beCols = [
  { key: 'c', label: 'Camada', x: M + 10, w: 175 },
  { key: 'o', label: 'Onde fica', x: M + 185, w: 190 },
  { key: 'a', label: 'Arquivos', x: M + 385, w: 50, align: 'right' },
  { key: 'l', label: 'Linhas', x: M + 448, w: 52, align: 'right' },
];
ensure(20 + beRows.length * 20 + 20);
tableHeader(beCols);
beRows.forEach((r, i) => {
  const v = be[r[2]] || { arquivos: 0, linhas: 0 };
  tableRow(beCols, [
    { text: r[0], bold: true },
    { text: r[1] },
    { text: PT(v.arquivos, 0) },
    { text: PT(v.linhas, 0) },
  ], i % 2 === 1, null, 20);
});
const runtimeFiles = beRows.reduce((s, r) => s + ((be[r[2]] || {}).arquivos || 0), 0);
const runtimeLines = beRows.reduce((s, r) => s + ((be[r[2]] || {}).linhas || 0), 0);
tableRow(beCols, [
  { text: 'Total do runtime (sem scripts)', bold: true },
  { text: '—' },
  { text: PT(runtimeFiles, 0), bold: true },
  { text: PT(runtimeLines, 0), bold: true },
], false, null, 20);
y += 18;
const beTexto =
  `São ${PT(runtimeLines, 0)} linhas de runtime em ${runtimeFiles} arquivos, mais ` +
  `${PT((be['Scripts de operação'] || {}).linhas || 0, 0)} linhas de scripts de operação. ` +
  `A arquitetura é enxuta: os route handlers validam com Zod e delegam a um contrato ` +
  `“Repositorio” com duas implementações — Firestore em produção e arquivos JSON em .data/ ` +
  `no modo dev/demo, escolhidas pela variável REPOSITORY. A sessão é um session cookie ` +
  `httpOnly do Firebase Auth (5 dias), com papéis de administrador lidos de ADMIN_EMAILS. ` +
  `Os PDFs das partituras são gravados como base64 dentro do próprio documento do Firestore: ` +
  `isso evita o Cloud Storage (que passou a exigir o plano pago) e impõe o limite de 1 MiB ` +
  `por documento, ou seja, cerca de 700 KB de PDF por partitura.`;
doc.font(FONT_REG).fontSize(8.6);
const beH = doc.heightOfString(beTexto, { width: CW - 36, lineGap: 2.5 }) + 26;
ensure(beH);
doc.roundedRect(M, y, CW, beH, 6).fill(C.panel);
doc.rect(M, y, 4, beH).fill(C.teal);
doc.fillColor(C.ink2).font(FONT_REG).fontSize(8.6)
  .text(beTexto, M + 18, y + 13, { width: CW - 36, lineGap: 2.5 });
y += beH + 26;

// 08 — reescrever em Python?
ensure(300);
sectionTitle(8, 'E se o backend fosse reescrito em Python?',
  'Mapeamento peça a peça, custos reais e onde o Python realmente compensaria.');
const pyCols = [
  { key: 'a', label: 'Peça hoje (TypeScript)', x: M + 10, w: 195 },
  { key: 'b', label: 'Equivalente em Python', x: M + 205, w: 160 },
  { key: 'c', label: 'Impacto', x: M + 372, w: 165 },
];
const pyRows = [
  ['10 route handlers', 'FastAPI + Pydantic', 'reescrever (~500 linhas)', C.amber],
  ['Schemas Zod na borda', 'Pydantic', 'contratos duplicados', C.amber],
  ['RepositorioFirebase', 'google-cloud-firestore', 'reescrever (~220 linhas)', C.amber],
  ['RepositorioLocal', 'pathlib + JSON', 'reescrever (~180 linhas)', C.amber],
  ['Session cookie do Auth', 'firebase-admin (Python)', 'já existe', '#16a34a'],
  ['import-vfp.ts + dbf.ts', 'dbfread + pypdf', 'Python ganha', '#16a34a'],
  ['Leitura da partitura (pdf.js)', 'pdfplumber no servidor', 'perde latência', '#ef4444'],
];
ensure(20 + pyRows.length * 20 + 30);
tableHeader(pyCols);
pyRows.forEach((r, i) => {
  tableRow(pyCols, [
    { text: r[0] }, { text: r[1] }, { text: r[2], dot: r[3] },
  ], i % 2 === 1, null, 20);
});
y += 18;
ensure(150);
doc.fillColor(C.ink).font(FONT_BOLD).fontSize(9.5)
  .text('Os quatro custos reais', M + 10, y, { width: CW - 20 });
y += 16;
richList([
  { parts: [{ text: 'Deploy. ', bold: true }, { text: 'Vercel Functions é Node. Python serverless lá é limitado (cold start, sem streaming nativo); seria preciso Cloud Run, Fly.io, Railway — ou o container Docker que já existe. Na prática: um segundo serviço, pipeline, domínio e CORS.' }] },
  { parts: [{ text: 'Tipagem de ponta a ponta. ', bold: true }, { text: 'Hoje o front e o back compartilham src/lib/types.ts e validam com o mesmo schema. Em Python isso vira duas fontes de verdade: Pydantic no servidor e tipos gerados do OpenAPI no front.' }] },
  { parts: [{ text: 'Firestore em Python. ', bold: true }, { text: 'google-cloud-firestore é async-first e tem API diferente da do SDK Node — os 198 linhas do repositório firebase.ts precisariam ser reescritos.' }] },
  { parts: [{ text: 'Análise de PDF no servidor. ', bold: true }, { text: 'A sugestão de título, autor, instrumento e estilo roda hoje no navegador, reaproveitando o pdf.js que o player já carregou. Mover para o servidor significa subir o arquivo antes de o usuário confirmar: mais latência, mais banda e menos privacidade.' }] },
], M + 10, CW - 20);
y += 14;
ensure(190);
doc.fillColor(C.ink).font(FONT_BOLD).fontSize(9.5)
  .text('Onde o Python compensaria — e onde não', M + 10, y, { width: CW - 20 });
y += 16;
richList([
  { parts: [{ text: 'Ganha: ', bold: true, color: '#16a34a' }, { text: 'análise musical de verdade. Transcrição e OCR de partitura (PDF escaneado → MusicXML), estatística de tonalidade, transposição e nível — ecossistema Python (music21, verovio, pypdf, OpenCV, Tesseract) incomparavelmente melhor que o JavaScript.' }] },
  { parts: [{ text: 'Ganha: ', bold: true, color: '#16a34a' }, { text: 'importador DBF. dbfread resolve o leitor de 120 linhas com um arquivo só, e o driver ODBC do FoxPro cobre casos que o DBF puro não lê.' }] },
  { parts: [{ text: 'Perde: ', bold: true, color: '#ef4444' }, { text: 'o CRUD do dia a dia. São 10 rotas de 632 linhas; reescrevê-las em FastAPI entrega o mesmo resultado com ~2.000 linhas novas, um serviço novo e um contrato de API para manter.' }] },
], M + 10, CW - 20);
y += 12;
const veredito =
  'Não compensa hoje. O backend é CRUD fino, colado no front, com tipos compartilhados e zero ' +
  'infraestrutura extra — características que se pagam caro ao trocar de linguagem. O caminho que resolve ' +
  'o problema real é híbrido: manter a API em Next.js e extrair apenas o que o Python faz ' +
  'melhor, como um CLI chamado pelo npm script (import-vfp → dbfread + pypdf). Se um dia o ' +
  'limite de 1 MiB do Firestore for o gargalo, a decisão a tomar é de banco de dados — ' +
  'Postgres ou SQLite — e não de framework.';
const verH = doc.font(FONT_REG).fontSize(9).heightOfString(veredito, { width: CW - 36, lineGap: 2.5 }) + 28;
ensure(verH);
doc.roundedRect(M, y, CW, verH, 6).fill(C.purpleL);
doc.fillColor(C.purple).font(FONT_BOLD).fontSize(8.6)
  .text('VEREDITO', M + 18, y + 11, { width: CW - 36, characterSpacing: 0.6 });
doc.fillColor(C.ink2).font(FONT_REG).fontSize(9)
  .text(veredito, M + 18, y + 25, { width: CW - 36, lineGap: 2.5 });
y += verH + 26;

// 09
ensure(220);
sectionTitle(9, 'Principais achados',
  'Leitura rápida dos números apurados na análise estática.');
const achados = [
  ['TypeScript em praticamente todo o produto',
    `${stats['TypeScript / JSX'].files + stats.TypeScript.files} arquivos .ts/.tsx somam ` +
    `${PT(stats['TypeScript / JSX'].lines + stats.TypeScript.lines, 0)} linhas — ` +
    `${PT(tsPct)}% do código de aplicação, com type-checking estrito.`],
  ['Três telas concentram a complexidade',
    'visualizador-pdf.tsx, catalogo.tsx e afinador.tsx são os três arquivos mais longos ' +
    'do projeto e concentram player, listagem e ferramentas de áudio.'],
  ['Firebase só no servidor',
    'As regras do Firestore bloqueiam o acesso direto do cliente; toda leitura e escrita ' +
    'passa por route handlers com o Admin SDK.'],
  ['PWA de verdade, não um wrapper',
    'Service worker, manifest e ícones próprios compõem o modo offline; o worker do pdf.js ' +
    'é copiado pelo postinstall.'],
  ['Backend fino, colado no front',
    `${PT(runtimeLines, 0)} linhas de runtime (${runtimeFiles} arquivos) em 10 rotas, com contrato ` +
    'de repositório, sessão por cookie e tipos compartilhados — reescrever isso em Python ' +
    'custa mais do que rende (ver seção 08).'],
];
doc.font(FONT_REG).fontSize(8.4);
const achadoRows = achados.map((a) => {
  const h = doc.heightOfString(a[1], { width: CW - 46 });
  return { title: a[0], desc: a[1], h, rowH: 12 + h + 9 };
});
const boxH = 16 + achadoRows.reduce((s, r) => s + r.rowH, 0) + 4;
ensure(boxH);
doc.roundedRect(M, y, CW, boxH, 8).fill(C.panel);
let ry = y + 16;
achadoRows.forEach((r) => {
  doc.circle(M + 18, ry + 5.5, 3.4).fill(C.purple);
  doc.fillColor(C.ink).font(FONT_BOLD).fontSize(9)
    .text(r.title, M + 30, ry, { width: CW - 46, lineBreak: false });
  doc.fillColor(C.muted).font(FONT_REG).fontSize(8.4)
    .text(r.desc, M + 30, ry + 12, { width: CW - 46, lineGap: 1 });
  ry += r.rowH;
});
y += boxH + 16;

// 10
ensure(160);
sectionTitle(10, 'Metodologia', 'Como os números foram apurados.');
ensure(100);
doc.roundedRect(M, y, CW, 86, 6).fill(C.panel);
doc.fillColor(C.ink2).font(FONT_REG).fontSize(8.4).text(
  'Contagem de linhas físicas (incluindo linhas em branco e comentários) por arquivo de texto. ' +
  'Excluídos: node_modules/, .next/, .data/ (estado local), public/pdf/ (worker do pdf.js ' +
  'copiado pelo postinstall), package-lock.json e tsconfig.tsbuildinfo. OLEGADO do FoxPro ' +
  'não é código deste repositório — o app desktop em Visual FoxPro 9 é a referência de origem, ' +
  'e a base de dados aqui é o Firestore. A pasta scripts/relatorio/ (ferramenta que gera este ' +
  'relatório) também fica de fora da medição.',
  M + 14, y + 14, { width: CW - 28, lineGap: 3 });
y += 86 + 18;

// 11
ensure(260);
sectionTitle(11, 'Glossário', 'Termos técnicos usados ao longo deste relatório.');
const termos = [
  ['TSX', 'Arquivo TypeScript com sintaxe JSX — os componentes React do App Router.'],
  ['App Router', 'Modelo de roteamento do Next.js 16, orientado a diretórios em src/app.'],
  ['Route Handler', 'Endpoint REST em src/app/api/**/route.ts.'],
  ['react-pdf', 'Wrapper React sobre o pdf.js, usado para renderizar as partituras em PDF.'],
  ['Firestore', 'Banco de documentos do Firebase; guarda as músicas e os PDFs em base64.'],
  ['Admin SDK', 'SDK do Firebase que ignora as regras de segurança e roda só no servidor.'],
  ['PWA', 'App instalável, com service worker e manifest próprios.'],
  ['SetList', 'Repertório: agrupa músicas e define a ordem de execução no player.'],
  ['Tailwind CSS 4', 'Framework de estilos utilitários; configuração em src/app/globals.css.'],
  ['FastAPI', 'Framework Python para APIs HTTP, com OpenAPI gerado automaticamente.'],
  ['Pydantic', 'Validação e serialização em Python — o equivalente ao Zod.'],
  ['dbfread', 'Leitor de arquivos DBF (Visual FoxPro) em Python puro.'],
  ['pypdf', 'Biblioteca Python para ler e extrair texto de PDFs.'],
];
const gcolW = (CW - 20) / 2;
const halfT = Math.ceil(termos.length / 2);
let gmax = 0;
[termos.slice(0, halfT), termos.slice(halfT)].forEach((col, ci) => {
  const gx = M + ci * (gcolW + 20);
  let gy = y;
  col.forEach((t) => {
    doc.fillColor(C.purple).font(FONT_BOLD).fontSize(8.4)
      .text(t[0], gx, gy, { width: gcolW, lineBreak: false });
    const h = doc.heightOfString(t[1], { width: gcolW });
    doc.fillColor(C.ink2).font(FONT_REG).fontSize(7.9)
      .text(t[1], gx, gy + 11, { width: gcolW, lineGap: 1 });
    gy += 11 + h + 8;
  });
  gmax = Math.max(gmax, gy - y);
});
y += gmax + 10;

// 10
ensure(114);
sectionTitle(12, 'Reprodutibilidade',
  'Os números podem ser conferidos com qualquer ferramenta de linha de comando.');
const cmd = 'find . -type f -not -path "./node_modules/*" -not -path "./.next/*" \\\n' +
  '  -not -path "./.data/*" -not -path "./public/pdf/*" -not -name "package-lock.json" \\\n' +
  '  -exec wc -l {} + | sort -n';
ensure(72);
doc.roundedRect(M, y, CW, 72, 6).fill(C.ink);
doc.fillColor('#a78bfa').font(FONT_BOLD).fontSize(7.4)
  .text('SHELL', M + 16, y + 13, { width: CW - 32, characterSpacing: 0.6 });
doc.fillColor('#e7e5e4').font(fs.existsSync(FONT_MONO) ? 'mono' : 'reg').fontSize(7.8)
  .text(cmd, M + 16, y + 29, { width: CW - 32, lineGap: 2.5 });

const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  const fy = PH - M + 16;
  doc.strokeColor(C.line).lineWidth(1).moveTo(M, fy - 12).lineTo(M + CW, fy - 12).stroke();
  const keepBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  doc.fillColor(C.faint).font(FONT_REG).fontSize(7.4)
    .text('Relatório de Linguagens · Pasta de Músicas', M, fy, { width: 300, lineBreak: false });
  doc.fillColor(C.faint).font(FONT_REG).fontSize(7.4)
    .text(`Página ${i - range.start + 1} de ${range.count}`, M + CW - 200, fy,
      { width: 200, align: 'right', lineBreak: false });
  doc.page.margins.bottom = keepBottom;
}

const stream = fs.createWriteStream(OUT);
doc.pipe(stream);
doc.end();
stream.on('finish', () => {
  const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
  console.log(`PDF: ${OUT}  (${kb} KB, ${range.count} páginas)`);
});

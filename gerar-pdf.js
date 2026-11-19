const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'A4',
  margins: { left: 50, right: 50, top: 50, bottom: 50 },
  info: {
    Title: 'Pasta de Músicas - Relatório de Alterações',
    Author: 'Sistema Pasta de Músicas',
    Subject: 'Detalhamento das solicitações de 19/11/2026',
    CreationDate: new Date(),
    ModDate: new Date()
  }
});

const outputPath = path.join(__dirname, 'Relatorio_Alteracoes_Pasta_de_Musicas.pdf');
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Cores
const azulPrimario = '#2563eb';
const azulEscuro = '#1d4ed8';
const cinzaTexto = '#6b7280';
const vermelho = '#dc2626';
const verde = '#059669';

// ================== CABEÇALHO ==================
doc.fillColor(azulPrimario).fontSize(22).text('Pasta de Músicas', 50, 50);
doc.fillColor(cinzaTexto).fontSize(12).text('Relatório de Alterações - Solicitações de 19/11/2026', 50, 85);
doc.moveDown(0.5);
doc.fillColor(cinzaTexto).fontSize(9).text('Data do relatório: 19 de Novembro de 2026', 50, 105);
doc.fillColor(cinzaTexto).fontSize(9).text('Aplicação rodando em: http://localhost:3000/', 50, 115);
doc.fillColor(cinzaTexto).fontSize(9).text('Banco de dados: músicas.DBF (Visual FoxPro) - estrutura mantida', 50, 125);
doc.moveDown(1);

// Linha divisória
doc.strokeColor(azulPrimario).lineWidth(1.5).moveTo(50, 140).lineTo(545, 140).stroke();
doc.moveDown(0.5);

// ================== INTRODUÇÃO ==================
doc.fillColor('#1a1a2e').fontSize(14).text('Introdução', { continued: false });
doc.fillColor('#333').fontSize(10).text(
  'Este documento detalha todas as alterações implementadas na aplicação "Pasta de Músicas", ' +
  'atendendo às solicitações apresentadas em 19 de novembro de 2026. A aplicação foi desenvolvida ' +
  'como uma aplicação web (Node.js + Express) que roda localmente na porta 3000, mantendo a mesma ' +
  'estrutura de banco de dados Visual FoxPro (.DBF) existente, sem alterar os arquivos originais.'
);
doc.moveDown(0.5);

doc.fillColor('#333').fontSize(10).text(
  'Arquivos criados/modificados:', { continued: false }
);
doc.fontSize(9).fillColor(cinzaTexto);
doc.text('• server.js - Servidor Express com API REST e leitura do banco músicas.DBF');
doc.text('• public/index.html - Interface completa (HTML/CSS/JS) com todas as telas');
doc.text('• data/musicas.json - Backup automático das alterações (cadastro, edição, exclusão)');
doc.text('• gerar-pdf.js - Script de geração deste relatório');
doc.moveDown(1);

// ================== ESTRUTURA ==================
doc.fillColor(azulPrimario).fontSize(14).text('Estrutura da Aplicação', { continued: false });
doc.fillColor('#333').fontSize(10).text(
  'A aplicação é dividida em três telas principais, acessíveis a partir de um menu de navegação:'
);
doc.moveDown(0.3);

const secoesEstrutura = [
  { titulo: 'Tela 1 - Lista de Músicas', desc: 'Exibe todas as músicas cadastradas com filtros de busca, instrumento, estilo e grupo.' },
  { titulo: 'Tela 2 - Visualizador de Música', desc: 'Abre a música selecionada com conteúdo (PDF), observações, controles de navegação, modo dual page/rolagem e cursor karaokê.' },
  { titulo: 'Tela 3 - Manutenção (Cadastro)', desc: 'Permite cadastrar, editar e excluir músicas, incluindo todos os campos do banco de dados.' }
];

secoesEstrutura.forEach((s, i) => {
  doc.fillColor(azulEscuro).fontSize(11).text(`${i + 1}. ${s.titulo}`);
  doc.fillColor('#333').fontSize(9).text(s.desc);
  doc.moveDown(0.3);
});

doc.moveDown(0.5);

// ================== SOLICITAÇÕES MANUTENÇÃO ==================
doc.fillColor(azulPrimario).fontSize(14).text('Manutenção - Alterações Implementadas', { continued: false });
doc.strokeColor(azulPrimario).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
doc.moveDown(0.5);

const solicitacoesManutencao = [
  {
    num: '1',
    titulo: 'Instrumento / Tipo - Seta do combo não abria a lista',
    problema: 'O campo Instrumento/Tipo só exibia a lista de opções quando o usuário digitava algo. Clicar na seta (dropdown) não abria a lista.',
    solucao: 'Foi implementado um combo customizado que funciona nos dois modos: clicar na seta (▼) abre a lista completa de opções, e digitar no campo filtra a lista em tempo real. Aplica-se tanto à tela de Manutenção quanto aos filtros da Lista de Músicas.',
    arquivo: 'public/index.html (função initCustomCombo)'
  },
  {
    num: '2',
    titulo: 'Campo Ordem - Digitar sobre o zero deixava "0" na frente',
    problema: 'Quando o usuário digitava um número sobre o valor "0" existente (sem apagar primeiro), o resultado ficava com zero à esquerda (ex: digitar "5" sobre "0" resultava em "05").',
    solucao: 'Ao entrar no campo Ordem, se o valor for "0", ele é automaticamente limpo. Durante a digitação, o sistema aceita apenas dígitos numéricos e remove automaticamente zeros à esquerda.',
    arquivo: 'public/index.html (eventos focus e input do campo manOrdem)'
  },
  {
    num: '3',
    titulo: 'Observações só apareciam na Manutenção',
    problema: 'O campo Observações (OBSERVAÇÕE) só era visível na tela de cadastro/manutenção. O músico não conseguia lê-las ao abrir a música.',
    solucao: 'As observações são exibidas em um rodapé dedicado na tela do Visualizador (música aberta). Se a música tiver observações cadastradas, elas aparecem automaticamente. Se não houver, um botão "Ver Observações" informa que não há texto cadastrado.',
    arquivo: 'public/index.html (container obsFooter)'
  }
];

solicitacoesManutencao.forEach((s) => {
  doc.fillColor(vermelho).fontSize(11).text(`Solicitação ${s.num} - ${s.titulo}`);
  doc.fillColor('#333').fontSize(9).text(`Problema: ${s.problema}`);
  doc.fillColor(verde).fontSize(9).text(`Solução: ${s.solucao}`);
  doc.fillColor(cinzaTexto).fontSize(8).text(`Arquivo: ${s.arquivo}`);
  doc.moveDown(0.4);
});

doc.addPage();

// ================== SOLICITAÇÕES MÚSICAS ==================
doc.fillColor(azulPrimario).fontSize(14).text('Músicas - Alterações Implementadas', { continued: false });
doc.strokeColor(azulPrimario).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
doc.moveDown(0.5);

const solicitacoesMusicas = [
  {
    num: '4',
    titulo: 'Voltar para a 1ª música em vez de voltar na mesma',
    problema: 'Ao abrir uma música e voltar para a lista, a aplicação retornava sempre à 1ª música da tela, forçando o músico a rolar novamente até encontrar a música onde estava.',
    solucao: 'A aplicação memoriza o índice da música aberta e a posição de scroll da lista antes de abrir o visualizador. Ao clicar "Voltar", o usuário retorna exatamente à mesma música e à mesma posição da lista. Com isso, a opção "Continuar de onde parou" deixa de ser necessária.',
    arquivo: 'public/index.html (variáveis indiceMusicaAberta e scrollPosLista)'
  },
  {
    num: '5',
    titulo: 'Tela reduzida (tablet) - Filtros sumiam',
    problema: 'Ao diminuir a tela do Windows para aspecto tablet, os objetos se ajustavam, mas os filtros desapareciam da tela.',
    solucao: 'O container de filtros usa layout responsivo com overflow-x: auto. Em telas pequenas (tablet/celular), os filtros permanecem visíveis com rolagem horizontal, não somem mais.',
    arquivo: 'public/index.html (containerFiltros e CSS media query)'
  },
  {
    num: '6',
    titulo: 'Duas páginas vs rolagem contínua',
    problema: 'Quando havia duas páginas, a aplicação abria em duas páginas lado a lado, mas em algumas situações é preferível apenas rolar.',
    solucao: 'Foi adicionado um botão "Modo: Duas Páginas / Rolagem" no visualizador que alterna entre: visualização em duas páginas lado a lado (dual page) e rolagem contínua simples. Respeita também o campo ROLAMENTO (T/F) do banco de dados.',
    arquivo: 'public/index.html (botão btnModoDual e função aplicarModoDual)'
  },
  {
    num: '7',
    titulo: 'Cursor karaokê - Linha vertical vermelha percorrendo a música',
    problema: 'Não havia nenhum indicador visual de posição durante a execução da música.',
    solucao: 'Foi implementado um cursor karaokê: uma linha vertical vermelha que percorre horizontalmente a partitura/letra da música. Inclui controles de Iniciar, Pausar e Reiniciar, além de ajuste de velocidade usando o campo VELOCIDADE (1-9) do banco de dados.',
    arquivo: 'public/index.html (elemento karaoke-line, timerKaraoke e controles)'
  }
];

solicitacoesMusicas.forEach((s) => {
  doc.fillColor(vermelho).fontSize(11).text(`Solicitação ${s.num} - ${s.titulo}`);
  doc.fillColor('#333').fontSize(9).text(`Problema: ${s.problema}`);
  doc.fillColor(verde).fontSize(9).text(`Solução: ${s.solucao}`);
  doc.fillColor(cinzaTexto).fontSize(8).text(`Arquivo: ${s.arquivo}`);
  doc.moveDown(0.4);
});

doc.moveDown(0.5);

// ================== BANCO DE DADOS ==================
doc.fillColor(azulPrimario).fontSize(14).text('Banco de Dados - Estrutura Mantida', { continued: false });
doc.strokeColor(azulPrimario).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
doc.moveDown(0.5);

doc.fillColor('#333').fontSize(10).text(
  'A estrutura original do banco de dados Visual FoxPro (músicas.DBF) foi mantida integralmente. Nenhum campo foi alterado, removido ou renomeado.'
);
doc.moveDown(0.3);

const campos = [
  { campo: 'MÚSICA', tipo: 'C(50)', desc: 'Nome da música' },
  { campo: 'AUTOR', tipo: 'C(50)', desc: 'Autor(es) da música' },
  { campo: 'GRUPO', tipo: 'C(20)', desc: 'Grupo / Repertório (Setlist)' },
  { campo: 'ESTILO', tipo: 'C(20)', desc: 'Estilo musical' },
  { campo: 'INSTRUMENT', tipo: 'C(20)', desc: 'Instrumento / Tipo' },
  { campo: 'PDF', tipo: 'C(100)', desc: 'Caminho do arquivo PDF' },
  { campo: 'ROLAMENTO', tipo: 'L(1)', desc: 'Habilita rolagem (T/F)' },
  { campo: 'VELOCIDADE', tipo: 'N(1)', desc: 'Velocidade do cursor karaokê (1-9)' },
  { campo: 'OBSERVAÇÕE', tipo: 'C(100)', desc: 'Observações para o músico' },
  { campo: 'ORDEM', tipo: 'N(2)', desc: 'Ordem de apresentação' }
];

// Tabela de campos
const tabelaTop = doc.y;
doc.fillColor(azulPrimario).fontSize(9).text('Campo', 50, tabelaTop);
doc.text('Tipo', 160, tabelaTop);
doc.text('Descrição', 220, tabelaTop);
doc.strokeColor(azulPrimario).lineWidth(0.5).moveTo(50, tabelaTop + 12).lineTo(545, tabelaTop + 12).stroke();

let yAtual = tabelaTop + 18;
campos.forEach((c) => {
  doc.fillColor('#333').fontSize(8.5).text(c.campo, 50, yAtual);
  doc.text(c.tipo, 160, yAtual);
  doc.text(c.desc, 220, yAtual);
  yAtual += 14;
});

doc.moveDown(0.5);

// ================== COMO USAR ==================
doc.fillColor(azulPrimario).fontSize(14).text('Como Colocar em Funcionamento', { continued: false });
doc.strokeColor(azulPrimario).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
doc.moveDown(0.5);

const passos = [
  '1. Acesse a pasta do projeto: cd /home/marcio/Teste/MusicaIvan',
  '2. Inicie o servidor: node server.js',
  '3. Abra no navegador: http://localhost:3000/',
  '4. O sistema lê automaticamente o banco músicas.DBF na inicialização',
  '5. Alterações (cadastro, edição, exclusão) são salvas em data/musicas.json'
];

passos.forEach((p) => {
  doc.fillColor('#333').fontSize(10).text(p);
});

doc.moveDown(0.5);

// ================== RESUMO ==================
doc.fillColor(azulPrimario).fontSize(14).text('Resumo das Alterações', { continued: false });
doc.strokeColor(azulPrimario).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
doc.moveDown(0.5);

const resumo = [
  { item: 'Total de solicitações atendidas', valor: '7' },
  { item: 'Telas da aplicação', valor: '3 (Lista, Visualizador, Manutenção)' },
  { item: 'Banco de dados', valor: 'músicas.DBF (estrutura mantida)' },
  { item: 'Servidor', valor: 'Node.js + Express na porta 3000' },
  { item: 'Compatibilidade', valor: 'Celular, tablet, notebook e desktop' },
  { item: 'PDFs originais', valor: 'Intocados na pasta /PDF/' }
];

resumo.forEach((r) => {
  doc.fillColor(azulEscuro).fontSize(10).text(r.item + ':', { continued: true });
  doc.fillColor('#333').fontSize(10).text(' ' + r.valor);
  doc.moveDown(0.2);
});

doc.moveDown(0.5);

// Rodapé
doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
doc.moveDown(0.3);
doc.fillColor(cinzaTexto).fontSize(8).text(
  'Relatório gerado automaticamente pela aplicação Pasta de Músicas - 19/11/2026', 50, doc.y + 5
);
doc.fillColor(cinzaTexto).fontSize(8).text(
  'Todos os direitos reservados. Estrutura de banco de dados Visual FoxPro mantida.', 50, doc.y + 12
);

// Finalizar
doc.end();

stream.on('finish', () => {
  console.log('PDF gerado com sucesso:', outputPath);
  console.log('Tamanho:', fs.statSync(outputPath).size, 'bytes');
});

stream.on('error', (err) => {
  console.error('Erro ao gerar PDF:', err);
});

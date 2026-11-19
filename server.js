const express = require('express');
const path = require('path');
const fs = require('fs');
const dbf = require('dbf');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Caminho do banco original
const DBF_PATH = path.join(__dirname, 'Músicas_Demo_copia', 'músicas.DBF');
const JSON_BACKUP = path.join(__dirname, 'data', 'musicas.json');

// Garante pasta de backup
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Carrega músicas do DBF
let musicas = [];
let nextId = 1;

function carregarDBF() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(DBF_PATH)) {
      console.log('Arquivo DBF não encontrado:', DBF_PATH);
      carregarBackup();
      return resolve();
    }

    dbf(DBF_PATH, (err, records) => {
      if (err) {
        console.warn('Erro ao ler DBF:', err.message);
        carregarBackup();
        return resolve();
      }

      musicas = records.map((r, i) => ({
        id: i + 1,
        musica: (r.MÚSICA || r.MUSICA || '').trim(),
        autor: (r.AUTOR || '').trim(),
        grupo: (r.GRUPO || '').trim(),
        estilo: (r.ESTILO || '').trim(),
        instrument: (r.INSTRUMENT || '').trim(),
        pdf: (r.PDF || '').trim(),
        rolamento: r.ROLAMENTO === 'T' || r.ROLAMENTO === true ? 'T' : 'F',
        velocidade: r.VELOCIDADE ? String(r.VELOCIDADE).trim() : '',
        observacoe: (r.OBSERVAÇÕE || r.OBSERVACOES || '').trim(),
        ordem: r.ORDEM ? parseInt(r.ORDEM, 10) || 0 : 0
      }));

      nextId = musicas.length > 0 ? Math.max(...musicas.map(m => m.id)) + 1 : 1;
      salvarBackup();
      console.log(`Carregadas ${musicas.length} músicas do DBF.`);
      resolve();
    });
  });
}

function carregarBackup() {
  if (fs.existsSync(JSON_BACKUP)) {
    try {
      const dados = JSON.parse(fs.readFileSync(JSON_BACKUP, 'utf-8'));
      musicas = dados.musicas || [];
      nextId = dados.nextId || musicas.length + 1;
      console.log(`Carregadas ${musicas.length} músicas do backup JSON.`);
    } catch (e) {
      console.warn('Erro ao ler backup JSON:', e.message);
      musicas = [];
      nextId = 1;
    }
  } else {
    musicas = [];
    nextId = 1;
  }
}

function salvarBackup() {
  try {
    fs.writeFileSync(JSON_BACKUP, JSON.stringify({ musicas, nextId }, null, 2));
  } catch (e) {
    console.warn('Erro ao salvar backup:', e.message);
  }
}

// ================== ROTAS ==================

// Listar músicas (com filtros opcionais)
app.get('/api/musicas', (req, res) => {
  let resultado = [...musicas];

  const busca = (req.query.busca || '').toLowerCase().trim();
  const instrumento = (req.query.instrumento || '').trim();
  const estilo = (req.query.estilo || '').trim();
  const grupo = (req.query.grupo || '').trim();

  if (busca) {
    resultado = resultado.filter(m =>
      m.musica.toLowerCase().includes(busca) ||
      m.autor.toLowerCase().includes(busca) ||
      m.estilo.toLowerCase().includes(busca)
    );
  }
  if (instrumento) {
    resultado = resultado.filter(m => m.instrumento === instrumento);
  }
  if (estilo) {
    resultado = resultado.filter(m => m.estilo === estilo);
  }
  if (grupo) {
    resultado = resultado.filter(m => m.grupo === grupo);
  }

  resultado.sort((a, b) => a.ordem - b.ordem || a.musica.localeCompare(b.musica));
  res.json(resultado);
});

// Obter valores únicos para filtros
app.get('/api/filtros', (req, res) => {
  const instrumentos = [...new Set(musicas.map(m => m.instrumento).filter(Boolean))].sort();
  const estilos = [...new Set(musicas.map(m => m.estilo).filter(Boolean))].sort();
  const grupos = [...new Set(musicas.map(m => m.grupo).filter(Boolean))].sort();
  res.json({ instrumentos, estilos, grupos });
});

// Buscar música por ID
app.get('/api/musicas/:id', (req, res) => {
  const m = musicas.find(x => x.id === parseInt(req.params.id, 10));
  if (!m) return res.status(404).json({ erro: 'Música não encontrada' });
  res.json(m);
});

// Criar música
app.post('/api/musicas', (req, res) => {
  const { musica, autor, grupo, estilo, instrument, pdf, rolamento, velocidade, observacoe, ordem } = req.body;

  if (!musica) {
    return res.status(400).json({ erro: 'Nome da música é obrigatório' });
  }

  const nova = {
    id: nextId++,
    musica: musica.trim(),
    autor: (autor || '').trim(),
    grupo: (grupo || '').trim(),
    estilo: (estilo || '').trim(),
    instrument: (instrument || '').trim(),
    pdf: (pdf || '').trim(),
    rolamento: rolamento || 'T',
    velocidade: velocidade ? String(velocidade) : '',
    observacoe: (observacoe || '').trim(),
    ordem: ordem ? parseInt(ordem, 10) : 0
  };

  musicas.push(nova);
  salvarBackup();
  res.status(201).json(nova);
});

// Atualizar música
app.put('/api/musicas/:id', (req, res) => {
  const idx = musicas.findIndex(x => x.id === parseInt(req.params.id, 10));
  if (idx === -1) return res.status(404).json({ erro: 'Música não encontrada' });

  const { musica, autor, grupo, estilo, instrument, pdf, rolamento, velocidade, observacoe, ordem } = req.body;

  if (!musica) {
    return res.status(400).json({ erro: 'Nome da música é obrigatório' });
  }

  musicas[idx] = {
    ...musicas[idx],
    musica: musica.trim(),
    autor: (autor || '').trim(),
    grupo: (grupo || '').trim(),
    estilo: (estilo || '').trim(),
    instrument: (instrument || '').trim(),
    pdf: (pdf || '').trim(),
    rolamento: rolamento || 'T',
    velocidade: velocidade ? String(velocidade) : '',
    observacoe: (observacoe || '').trim(),
    ordem: ordem ? parseInt(ordem, 10) : 0
  };

  salvarBackup();
  res.json(musicas[idx]);
});

// Excluir música
app.delete('/api/musicas/:id', (req, res) => {
  const idx = musicas.findIndex(x => x.id === parseInt(req.params.id, 10));
  if (idx === -1) return res.status(404).json({ erro: 'Música não encontrada' });

  musicas.splice(idx, 1);
  salvarBackup();
  res.json({ ok: true });
});

// Inicializar servidor
carregarDBF().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}/`);
  });
});

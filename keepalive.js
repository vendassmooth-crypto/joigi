const express = require('express');
const store = require('./store');

function formatBRL(n) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderPage() {
  const cfg = store.getConfig();
  const stats = store.getStats();
  const color = cfg.embedColor || '#00B0F4';

  const maisVendidosHtml = stats.maisVendidos.length
    ? stats.maisVendidos
        .map(
          (p, i) =>
            `<li><span class="rank">#${i + 1}</span><span class="prod-name">${escapeHtml(p.nome)}</span><span class="prod-qtd">${p.qtd} vendido(s)</span></li>`
        )
        .join('')
    : '<li class="empty">Nenhuma venda aprovada ainda.</li>';

  return `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(cfg.panel.title || 'Smooth Vendas')}</title>
<meta http-equiv="refresh" content="30" />
<style>
  :root { --accent: ${color}; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: radial-gradient(circle at top, #171a23 0%, #0b0d12 60%);
    color: #f1f1f5;
    display: flex;
    justify-content: center;
    padding: 48px 16px;
  }
  .wrap { width: 100%; max-width: 880px; }
  .status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 200, 81, 0.12);
    border: 1px solid rgba(0, 200, 81, 0.4);
    color: #00e676;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 18px;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #00e676; box-shadow: 0 0 10px #00e676; }
  h1 {
    font-size: 34px;
    margin: 0 0 6px;
    background: linear-gradient(90deg, var(--accent), #ffffff 120%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .subtitle { color: #9aa0ac; margin-bottom: 36px; font-size: 15px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px; margin-bottom: 28px; }
  .card {
    background: linear-gradient(160deg, #1b1f2a 0%, #14171f 100%);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 16px;
    padding: 22px;
    position: relative;
    overflow: hidden;
  }
  .card::before {
    content: '';
    position: absolute; top: -30%; right: -20%;
    width: 120px; height: 120px; border-radius: 50%;
    background: var(--accent); opacity: 0.12; filter: blur(20px);
  }
  .card .label { font-size: 13px; color: #9aa0ac; margin-bottom: 8px; }
  .card .value { font-size: 28px; font-weight: 700; }
  .card.highlight .value { color: var(--accent); }
  .panel {
    background: #14171f;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 16px;
    padding: 24px;
  }
  .panel h2 { font-size: 16px; margin: 0 0 16px; color: #d6d9e0; }
  ul { list-style: none; margin: 0; padding: 0; }
  li {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
    font-size: 14px;
  }
  li:last-child { border-bottom: none; }
  .rank { color: var(--accent); font-weight: 700; width: 32px; }
  .prod-name { flex: 1; color: #f1f1f5; }
  .prod-qtd { color: #9aa0ac; }
  .empty { color: #6b7280; font-style: italic; }
  footer { text-align: center; margin-top: 32px; color: #565c68; font-size: 12px; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="status"><span class="dot"></span> Bot online</div>
    <h1>${escapeHtml(cfg.panel.title || 'Smooth Vendas')}</h1>
    <div class="subtitle">Painel público de estatísticas — atualiza a cada 30 segundos</div>

    <div class="grid">
      <div class="card highlight">
        <div class="label">💰 Total arrecadado</div>
        <div class="value">${cfg.currencySymbol} ${formatBRL(stats.totalArrecadado)}</div>
      </div>
      <div class="card highlight">
        <div class="label">🛒 Vendas realizadas</div>
        <div class="value">${stats.totalVendas}</div>
      </div>
      <div class="card">
        <div class="label">📁 Categorias</div>
        <div class="value">${stats.totalCategorias}</div>
      </div>
      <div class="card">
        <div class="label">📦 Produtos cadastrados</div>
        <div class="value">${stats.totalProdutos}</div>
      </div>
      <div class="card">
        <div class="label">📥 Itens em estoque</div>
        <div class="value">${stats.totalEstoque}</div>
      </div>
    </div>

    <div class="panel">
      <h2>🔥 Mais vendidos</h2>
      <ul>${maisVendidosHtml}</ul>
    </div>

    <footer>Smooth Vendas • hospedado no Railway • uptime ${Math.floor(process.uptime() / 60)} min</footer>
  </div>
</body>
</html>`;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function startKeepAlive() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.get('/', (_req, res) => {
    res.status(200).send(renderPage());
  });

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  app.get('/api/stats', (_req, res) => {
    res.status(200).json(store.getStats());
  });

  app.listen(port, () => {
    console.log(`[keepalive] Servidor HTTP rodando na porta ${port}`);
  });
}

module.exports = { startKeepAlive };

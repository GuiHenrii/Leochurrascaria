# 🚀 PROJETO LÉO CHURRASCARIA - PARTE 1

## 📄 Arquivo: package.json
```json
{
  "name": "sistema",
  "version": "1.0.0",
  "description": "Sistema de autoatendimento WhatsApp para Churrascaria",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "escpos": "^3.0.0-alpha.6",
    "escpos-network": "^3.0.0-alpha.5",
    "escpos-usb": "^3.0.0-alpha.4",
    "express": "^5.2.1",
    "mysql2": "^3.20.0",
    "openai": "^6.32.0",
    "qrcode-terminal": "^0.12.0",
    "whatsapp-web.js": "^1.34.6"
  }
}

```

---

## 📄 Arquivo: public\app.js
```js
let currentPeriod = 'today';

async function fetchMetrics() {
    try {
        const response = await fetch(`/api/metrics?period=${currentPeriod}`);
        const data = await response.json();
        
        document.getElementById('metric-revenue').innerText = 
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.receita_total);
            
        document.getElementById('metric-sales').innerText = data.qtd_vendas;

        const mins = Math.floor(data.tempo_medio_segundos / 60);
        const secs = data.tempo_medio_segundos % 60;
        let timeStr = '';
        if (mins > 0) timeStr += `${mins}m `;
        timeStr += `${secs}s`;
        
        document.getElementById('metric-time').innerText = timeStr;
    } catch (err) {
        console.error("Erro API CRM:", err);
    }
}

function setPeriod(period) {
    currentPeriod = period;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    fetchMetrics();
}

async function resetMetrics() {
    if (confirm("🚨 TEM CERTEZA? Isso APAGARÁ o histórico de pedidos e receita para sempre! (O cardápio será mantido intacto).")) {
        const res = await fetch('/api/reset', { method: 'POST' });
        if (res.ok) {
            alert("Métricas zeradas com sucesso!");
            fetchMetrics();
        }
    }
}

async function fetchRecentOrders() {
    try {
        const response = await fetch('/api/recent-orders');
        const orders = await response.json();
        
        const list = document.getElementById('orders-list');
        list.innerHTML = '';
        orders.forEach(o => {
            const row = document.createElement('div');
            row.className = 'table-row table-body-row';
            
            const dataStr = new Date(o.criado_em).toLocaleString('pt-BR');
            const totalStr = `R$ ${Number(o.total).toFixed(2)}`;
            
            row.innerHTML = `
                <div class="cell-id">#${o.id}</div>
                <div class="cell-date">${dataStr}</div>
                <div class="cell-items">${o.itens || 'Sem itens'}</div>
                <div class="cell-type"><span class="status-badge">${o.tipo_pedido || 'BALCÃO'}</span></div>
                <div class="cell-total">${totalStr}</div>
                <div class="cell-pay">${o.forma_pagamento || '-'}</div>
            `;
            list.appendChild(row);
        });
    } catch (err) {
        console.error("Erro ao buscar pedidos:", err);
    }
}

function switchTab(tabId, el) {
    console.log(`[Tab] Mudando para: ${tabId}`);
    document.querySelectorAll('section[id$="-tab"]').forEach(s => {
        s.classList.add('hidden-tab');
        s.classList.remove('active-tab');
    });
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    const activeSection = document.getElementById(`${tabId}-tab`);
    if (activeSection) {
        activeSection.classList.remove('hidden-tab');
        activeSection.classList.add('active-tab');
    }
    
    if (el) el.classList.add('active');

    if (tabId === 'stock') fetchProducts();
}

async function fetchProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        const list = document.getElementById('product-list');
        list.innerHTML = '';

        products.forEach(p => {
            const card = document.createElement('div');
            card.className = `product-card glass ${p.disponivel ? '' : 'out-of-stock'}`;
            card.innerHTML = `
                <div class="product-info">
                    <p>${p.categoria_nome}</p>
                    <h4>${p.nome}</h4>
                </div>
                <div class="product-price">R$ ${Number(p.preco).toFixed(2)}</div>
                <button class="toggle-btn ${p.disponivel ? 'btn-active' : 'btn-inactive'}" onclick="toggleProduct(${p.id})">
                    ${p.disponivel ? '✅ EM ESTOQUE' : '❌ ESGOTADO'}
                </button>
            `;
            list.appendChild(card);
        });
    } catch (err) {
        console.error("Erro ao carregar cardápio:", err);
        const list = document.getElementById('product-list');
        if (list) list.innerHTML = `<p style="text-align: center; color: var(--neon-red); padding: 5rem;">❌ Erro ao carregar itens. Certifique-se de reiniciar o servidor no terminal!</p>`;
    }
}

async function toggleProduct(id) {
    try {
        const res = await fetch(`/api/products/toggle/${id}`, { method: 'POST' });
        if (res.ok) fetchProducts();
    } catch (err) {
        console.error("Erro ao alterar status:", err);
    }
}

function updateAll() {
    if (!document.getElementById('metrics-tab').classList.contains('hidden-tab')) {
        fetchMetrics();
        fetchRecentOrders();
    }
}

fetchMetrics();
fetchRecentOrders();
setInterval(updateAll, 3000);

```

---

## 📄 Arquivo: public\index.html
```html
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRM | Léo Churrascaria</title>
    <link rel="stylesheet" href="style.css?v=2.0">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
</head>

<body>
    <div class="background-canvas"></div>
    <div class="smoke-overlay"></div>
    <div class="dashboard-container">
        <header>
            <div class="live-badge">
                <div class="live-dot"></div>
                LIVE DASHBOARD
            </div>
            <h1>Léo Churrascaria CRM</h1>
            <p>Monitoramento Analítico em tempo real do Garçom Virtual</p>

            <nav class="nav-tabs">
                <button class="nav-tab active" onclick="switchTab('metrics', this)">📊 Métricas</button>
                <button class="nav-tab" onclick="switchTab('stock', this)">🥩 Cardápio / Estoque</button>
                <button class="nav-tab btn-reset" onclick="resetMetrics()">🗑️ Zerar Base</button>
            </nav>
        </header>

        <section id="metrics-tab" class="active-tab">
            <div class="tab-controls">
                <button class="tab active" onclick="setPeriod('today')">Hoje</button>
                <button class="tab" onclick="setPeriod('yesterday')">Ontem</button>
                <button class="tab" onclick="setPeriod('30days')">30 Dias</button>
                <button class="tab" onclick="setPeriod('all')">Histórico Total</button>
            </div>

            <main class="metrics-grid">
                <div class="card glass">
                    <div class="card-icon revenue-icon">💰</div>
                    <div class="card-info">
                        <h3>Receita Total Gerada</h3>
                        <h2 id="metric-revenue">R$ 0,00</h2>
                    </div>
                </div>

                <div class="card glass">
                    <div class="card-icon sales-icon">📈</div>
                    <div class="card-info">
                        <h3>Pedidos Fechados (IA)</h3>
                        <h2 id="metric-sales">0</h2>
                    </div>
                </div>

                <div class="card glass">
                    <div class="card-icon time-icon">⏱️</div>
                    <div class="card-info">
                        <h3>Tempo Médio (Atendimento)</h3>
                        <h2 id="metric-time">0s</h2>
                    </div>
                </div>
            </main>

            <div class="orders-container glass">
                <div class="section-header">
                    <h2>📋 Pedidos Recentes (Real-Time)</h2>
                </div>

                <div class="table-wrapper">
                    <div class="table-row table-header">
                        <div>ID</div>
                        <div>Data/Hora</div>
                        <div>Itens do Pedido</div>
                        <div>Tipo</div>
                        <div>Total</div>
                        <div>Pagamento</div>
                    </div>
                    <div id="orders-list">
                        <!-- Pedidos injetados via app.js -->
                    </div>
                </div>
            </div>
        </section> <!-- FIM metrics-tab -->

        <section id="stock-tab" class="hidden-tab">
            <div class="stock-header glass">
                <h2>📦 Gestão de Itens e Disponibilidade</h2>
                <p>Desative itens que acabaram na cozinha. O agente (IA) deixará de oferecê-los imediatamente.</p>
            </div>
            <div id="product-list" class="product-grid">
                <!-- Injetado via JavaScript -->
                <p style="text-align: center; color: var(--text-muted); padding: 5rem;">Carregando cardápio...</p>
            </div>
        </section>
    </div>
    <script src="app.js?v=2.2"></script>
</body>

</html>
```

---


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

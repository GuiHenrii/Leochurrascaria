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
        
        orders.forEach(order => {
            const date = new Date(order.criado_em).toLocaleString('pt-BR');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="color: var(--neon-red); font-weight: 800;">#${order.id}</td>
                <td style="font-size: 0.8rem; opacity: 0.7;">${date}</td>
                <td style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${order.itens || ''}">${order.itens || 'Sem itens'}</td>
                <td><span class="status-badge">${order.tipo_pedido.toUpperCase()}</span></td>
                <td style="font-weight: 800;">R$ ${parseFloat(order.total).toFixed(2)}</td>
                <td style="font-size: 0.8rem; opacity: 0.8;">${order.forma_pagamento || '-'}</td>
            `;
            list.appendChild(row);
        });
    } catch (err) {
        console.error("Erro ao buscar pedidos:", err);
    }
}

function switchTab(tabId) {
    document.querySelectorAll('section[id$="-tab"]').forEach(s => {
        s.classList.add('hidden-tab');
        s.classList.remove('active-tab');
    });
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    const activeSection = document.getElementById(`${tabId}-tab`);
    activeSection.classList.remove('hidden-tab');
    activeSection.classList.add('active-tab');
    
    // Ativa o botão correto
    event.target.classList.add('active');

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

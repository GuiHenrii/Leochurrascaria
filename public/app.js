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

fetchMetrics();
setInterval(fetchMetrics, 3000);

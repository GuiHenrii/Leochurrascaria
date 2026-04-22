async function fetchWhatsappStatus() {
    try {
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();
        
        const badge = document.getElementById('wa-status-badge');
        const qrContainer = document.getElementById('qr-container');
        const qrImage = document.getElementById('qr-image');
        
        if (data.status === 'CONNECTED') {
            badge.innerText = "✅ CONECTADO (Bot Ativo)";
            badge.style.background = "rgba(46, 213, 115, 0.2)";
            badge.style.color = "#2ed573";
            qrContainer.style.display = "none";
        } else if (data.status === 'QR_READY' && data.qr) {
            badge.innerText = "📲 AGUARDANDO LEITURA DO QR CODE";
            badge.style.background = "rgba(255, 165, 2, 0.2)";
            badge.style.color = "#ffa502";
            qrContainer.style.display = "block";
            qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data.qr)}`;
        } else if (data.status === 'STARTING') {
            badge.innerText = "🔄 INICIANDO ROBÔ...";
            badge.style.background = "rgba(255, 255, 255, 0.1)";
            badge.style.color = "#fff";
            qrContainer.style.display = "none";
        } else {
            badge.innerText = "❌ DESCONECTADO";
            badge.style.background = "rgba(255, 71, 87, 0.2)";
            badge.style.color = "#ff4757";
            qrContainer.style.display = "none";
        }
    } catch (e) {
        console.error("Erro ao buscar status do whatsapp:", e);
    }
}

async function logoutWhatsapp() {
    if (confirm("🚨 Tem certeza que deseja desconectar o número atual? O bot ficará offline até você escanear o novo QR Code.")) {
        try {
            const res = await fetch('/api/whatsapp/logout', { method: 'POST' });
            if (res.ok) {
                alert("Desconectando... Aguarde cerca de 5 a 10 segundos para o robô limpar a memória e o novo QR Code aparecer na tela.");
                document.getElementById('wa-status-badge').innerText = "🔄 LIMPANDO MEMÓRIA...";
                fetchWhatsappStatus();
            }
        } catch (e) {
            alert("Erro ao tentar desconectar.");
        }
    }
}

async function restartWhatsapp() {
    if (confirm("🔄 Deseja apenas reiniciar o robô? (O número atual continuará logado).")) {
        try {
            const res = await fetch('/api/whatsapp/restart', { method: 'POST' });
            if (res.ok) {
                document.getElementById('wa-status-badge').innerText = "🔄 REINICIANDO...";
                fetchWhatsappStatus();
            }
        } catch (e) {
            alert("Erro ao tentar reiniciar.");
        }
    }
}

async function clearPausedContacts() {
    if (confirm("🔓 Deseja liberar TODOS os contatos pausados?\n\nIsso fará com que o robô volte a responder automaticamente para todos os clientes que o humano assumiu o controle hoje.")) {
        try {
            const res = await fetch('/api/whatsapp/clear-paused', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                alert("Sucesso! " + data.message);
            } else {
                alert("Erro: " + data.error);
            }
        } catch (e) {
            alert("Erro ao liberar contatos.");
        }
    }
}

async function clearDatabase() {
    const p1 = prompt("🚨 ATENÇÃO 🚨\nIsso apagará TODOS os pedidos do banco de dados (histórico e itens).\nTem certeza? Digite 'SIM' para continuar:");
    if (p1 === 'SIM') {
        const p2 = prompt("Você tem certeza ABSOLUTA? Digite 'LIMPAR' para confirmar a deleção:");
        if (p2 === 'LIMPAR') {
            try {
                const res = await fetch('/api/clear-database', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    alert("Banco de dados limpo com sucesso! Os próximos pedidos começarão do #1.");
                } else {
                    alert("Erro: " + data.error);
                }
            } catch (e) {
                alert("Erro ao limpar banco.");
            }
        }
    }
}

setInterval(fetchWhatsappStatus, 3000);
fetchWhatsappStatus();

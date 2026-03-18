const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');

const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/metrics', async (req, res) => {
    try {
        const period = req.query.period;

        // Dados Fictícios de Apresentação
        if (period === 'yesterday') {
            return res.json({ receita_total: 4850.50, qtd_vendas: 42, tempo_medio_segundos: 215 });
        }
        if (period === '30days') {
            return res.json({ receita_total: 124250.00, qtd_vendas: 1045, tempo_medio_segundos: 190 });
        }

        let dateFilter = '';
        if (period === 'today') {
            dateFilter = ' WHERE DATE(criado_em) = CURDATE()';
        }

        const [receitaRows] = await db.pool.query(`SELECT SUM(total) as receita_total FROM pedidos${dateFilter}`);
        const receita = receitaRows[0].receita_total || 0;

        const [vendasRows] = await db.pool.query(`SELECT COUNT(*) as qtd_vendas FROM pedidos${dateFilter}`);
        const vendas = vendasRows[0].qtd_vendas || 0;

        const tempoFilter = dateFilter ? `${dateFilter} AND tempo_fechamento_segundos > 0` : ' WHERE tempo_fechamento_segundos > 0';
        const [tempoRows] = await db.pool.query(`SELECT AVG(tempo_fechamento_segundos) as tempo_medio FROM pedidos${tempoFilter}`);
        const tempoMedio = tempoRows[0].tempo_medio || 0;

        res.json({
            receita_total: receita,
            qtd_vendas: vendas,
            tempo_medio_segundos: Math.round(tempoMedio)
        });
    } catch (e) {
        console.error("Erro na API CRM:", e.message);
        res.status(500).json({ error: "Erro interno CRM" });
    }
});

app.post('/api/reset', async (req, res) => {
    try {
        await db.pool.query('SET FOREIGN_KEY_CHECKS = 0');
        await db.pool.query('TRUNCATE TABLE itens_pedido');
        await db.pool.query('TRUNCATE TABLE pedidos');
        await db.pool.query('TRUNCATE TABLE clientes');
        await db.pool.query('SET FOREIGN_KEY_CHECKS = 1');
        res.json({ success: true, message: "Dados purgados com sucesso!" });
    } catch (e) {
        console.error("Erro no reset CRM:", e.message);
        res.status(500).json({ error: "Erro ao limpar dados" });
    }
});

function initServer() {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`📊 Painel CRM ativo na web: http://localhost:${PORT}`);
    });
}

module.exports = { initServer, app };

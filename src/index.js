require('dotenv').config();
const db = require('./config/db');
const whatsapp = require('./services/whatsapp.service');
const server = require('./server');

async function main() {
    console.log("🍖 === SISTEMA DE AUTOATENDIMENTO LÉO CHURRASCARIA === 🍖");

    try {
        await db.pool.query('SELECT 1');
        console.log("✅ Banco de dados MySQL conectado e online.");

        try {
            // Migrações individuais para evitar que falha em uma coluna aborte as outras
            try { await db.pool.query('ALTER TABLE pedidos ADD COLUMN tempo_fechamento_segundos INT DEFAULT 0'); } catch(e) {}
            try { await db.pool.query('ALTER TABLE pedidos ADD COLUMN tipo_pedido ENUM("entrega", "retirada", "mesa") DEFAULT "entrega"'); } catch(e) {}
            try { await db.pool.query('ALTER TABLE pedidos ADD COLUMN endereco_entrega TEXT'); } catch(e) {}
            try { await db.pool.query('ALTER TABLE pedidos ADD COLUMN forma_pagamento VARCHAR(50)'); } catch(e) {}
            try { await db.pool.query('ALTER TABLE pedidos ADD COLUMN resumo_itens TEXT'); } catch(e) {}
            try { await db.pool.query('ALTER TABLE pedidos ADD COLUMN troco_para DECIMAL(10,2)'); } catch(e) {}
            try { await db.pool.query('ALTER TABLE pedidos ADD COLUMN cliente_fone VARCHAR(30)'); } catch(e) {}
            try { await db.pool.query('ALTER TABLE pedidos ADD COLUMN numero_mesa VARCHAR(20)'); } catch(e) {}
            try { await db.pool.query('ALTER TABLE pedidos ADD COLUMN impresso TINYINT(1) DEFAULT 0'); } catch(e) {}
            console.log("✅ Banco de Dados sincronizado com o CRM Pro e Impressão Remota.");
        } catch (e) {
            console.error("Erro crítico na sincronização do Banco:", e.message);
        }

    } catch (e) {
        console.warn("⚠️ AVISO: Falha na conexão com o Banco de Dados MySQL.");
        console.warn("Se você não tem o banco rodando, o sistema funcionará em modo mock (apenas impressão simplificada).");
        console.warn("Recomendação: Suba o MySQL nas configurações do .env e execute 'node src/init.js'.\n");
    }

    // Inicia o atendimento do WhatsApp
    whatsapp.init();

    // Inicia o Painel Web Dashboard
    server.initServer();
}

main();

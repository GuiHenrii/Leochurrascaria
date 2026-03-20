# 🚀 PROJETO LÉO CHURRASCARIA - PARTE 3

## 📄 Arquivo: src\config\db.js
```js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create pool without specifying the database first to allow creating it if missing
const poolWithoutDB = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'churrascaria_bot',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// A helper function to initialize DB and seed if needed
async function initDB() {
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Ensure Database exists
        await poolWithoutDB.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'churrascaria_bot'}\``);
        
        // Execute Schema
        const schemaPath = path.join(__dirname, '../database', 'schema.sql');
        const schemaQuery = fs.readFileSync(schemaPath, 'utf8');
        
        // Very basic way to execute multiple queries: connection.query doesn't support multipleStatements by default 
        // without passing multipleStatements: true, but we'll manually split them for simple init.
        // For robustness, it's better to pass multipleStatements in connection, but let's do safe split.
        const poolWithMultiple = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'churrascaria_bot',
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });

        await poolWithMultiple.query(schemaQuery);

        console.log("Database and tables initialized!");

        // Execute Seed
        const seedPath = path.join(__dirname, '../database', 'seed.sql');
        const seedQuery = fs.readFileSync(seedPath, 'utf8');
        await poolWithMultiple.query(seedQuery);

        console.log("Database seeded successfully!");
        poolWithMultiple.end();

    } catch (err) {
        console.error("Error initializing Database:", err);
    }
}

module.exports = {
    pool,
    initDB
};

```

---

## 📄 Arquivo: src\database\schema.sql
```sql
CREATE DATABASE IF NOT EXISTS churrascaria_bot;
USE churrascaria_bot;

CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    telefone VARCHAR(30) UNIQUE NOT NULL,
    nome VARCHAR(100),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria_id INT,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) NOT NULL,
    disponivel BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    status ENUM('aberto', 'confirmado', 'preparando', 'entregue', 'cancelado') DEFAULT 'aberto',
    total DECIMAL(10,2) DEFAULT 0.00,
    observacao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE IF NOT EXISTS itens_pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    preco_unitario DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

```

---

## 📄 Arquivo: src\database\seed.sql
```sql
USE churrascaria_bot;

-- =========================
-- 📂 CATEGORIAS
-- =========================
INSERT IGNORE INTO categorias (id, nome) VALUES 
(1, 'Espetão 500g'),
(2, 'Espetão 1kg'),
(3, 'Espetinho Simples'),
(4, 'Espetinho Especial'),
(5, 'Jantinha'),
(6, 'Saladas'),
(7, 'Caldos'),
(8, 'Porções'),
(9, 'Cervejas'),
(10, 'Long Neck'),
(11, 'Refrigerantes'),
(12, 'Bebidas'),
(13, 'Sucos');

-- =========================
-- 🧾 PRODUTOS (ID ÚNICO)
-- =========================
INSERT IGNORE INTO produtos (id, categoria_id, nome, descricao, preco) VALUES

-- ESPETÃO 500g (Acompanha: arroz, feijão tropeiro, vinagrete, mandioca e molho especial)
(1, 1, 'Picanha Black', 'Espetão 500g — a consultar', NULL),
(2, 1, 'Picanha', 'Espetão 500g com acompanhamentos', 99.00),
(3, 1, 'Contra Filé', 'Espetão 500g com acompanhamentos', 85.00),
(4, 1, 'Cupim', 'Espetão 500g com acompanhamentos', 99.00),
(5, 1, 'Lombo', 'Espetão 500g com acompanhamentos', 75.00),

-- ESPETÃO 1kg (Acompanha: arroz, feijão tropeiro, vinagrete, mandioca e molho especial)
(6, 2, 'Picanha', 'Espetão 1kg com acompanhamentos', 189.00),
(7, 2, 'Contra Filé', 'Espetão 1kg com acompanhamentos', 159.00),
(8, 2, 'Cupim', 'Espetão 1kg com acompanhamentos', 189.00),
(9, 2, 'Lombo', 'Espetão 1kg com acompanhamentos', 130.00),

-- ESPETINHO SIMPLES
(10, 3, 'Franbacon', '', 12.00),
(11, 3, 'Contra Filé', '', 14.00),
(12, 3, 'Queijo Coalho', '', 14.00),
(13, 3, 'Provolone', '', 14.00),
(14, 3, 'Coração', '', 12.00),
(15, 3, 'Linguiça sem pimenta', '', 12.00),
(16, 3, 'Linguiça com pimenta', '', 12.00),
(17, 3, 'Lombo suíno', '', 12.00),
(18, 3, 'Almôndega com bacon', '', 14.00),
(19, 3, 'Romeu e Julieta', '', 17.00),
(20, 3, 'Alcatra', '', 14.00),
(21, 3, 'Asinha de frango', '', 15.00),
(22, 3, 'Picanha 180g', '', 28.00),
(23, 3, 'Filé mignon', '', 17.00),
(24, 3, 'Cupim', '', 15.00),
(25, 3, 'Filé de frango', '', 12.00),

-- ESPETINHO ESPECIAL (Acompanha: vinagrete e mandioca)
(26, 4, 'Franbacon', 'Acompanha vinagrete e mandioca', 17.00),
(27, 4, 'Contra Filé', 'Acompanha vinagrete e mandioca', 19.00),
(28, 4, 'Queijo Coalho', 'Acompanha vinagrete e mandioca', 20.00),
(29, 4, 'Provolone', 'Acompanha vinagrete e mandioca', 21.00),
(30, 4, 'Coração', 'Acompanha vinagrete e mandioca', 17.00),
(31, 4, 'Linguiça sem pimenta', 'Acompanha vinagrete e mandioca', 17.00),
(32, 4, 'Linguiça com pimenta', 'Acompanha vinagrete e mandioca', 17.00),
(33, 4, 'Lombo suíno', 'Acompanha vinagrete e mandioca', 17.00),
(34, 4, 'Almôndega com bacon', 'Acompanha vinagrete e mandioca', 19.00),
(35, 4, 'Romeu e Julieta', 'Acompanha vinagrete e mandioca', 23.00),
(36, 4, 'Alcatra', 'Acompanha vinagrete e mandioca', 19.00),
(37, 4, 'Asinha de frango', 'Acompanha vinagrete e mandioca', 21.00),
(38, 4, 'Picanha 180g', 'Acompanha vinagrete e mandioca', 35.00),
(39, 4, 'Filé mignon', 'Acompanha vinagrete e mandioca', 25.00),
(40, 4, 'Cupim', 'Acompanha vinagrete e mandioca', 21.00),
(41, 4, 'Filé de frango', 'Acompanha vinagrete e mandioca', 17.00),

-- JANTINHA (Acompanha: arroz, feijão tropeiro, vinagrete, mandioca e molho especial)
(42, 5, 'Franbacon', 'Completa com acompanhamentos', 25.00),
(43, 5, 'Contra Filé', 'Completa com acompanhamentos', 26.00),
(44, 5, 'Queijo Coalho', 'Completa com acompanhamentos', 27.00),
(45, 5, 'Provolone', 'Completa com acompanhamentos', 29.00),
(46, 5, 'Coração', 'Completa com acompanhamentos', 25.00),
(47, 5, 'Linguiça sem pimenta', 'Completa com acompanhamentos', 25.00),
(48, 5, 'Linguiça com pimenta', 'Completa com acompanhamentos', 25.00),
(49, 5, 'Lombo suíno', 'Completa com acompanhamentos', 25.00),
(50, 5, 'Almôndega com bacon', 'Completa com acompanhamentos', 26.00),
(51, 5, 'Romeu e Julieta', 'Completa com acompanhamentos', 29.00),
(52, 5, 'Alcatra', 'Completa com acompanhamentos', 26.00),
(53, 5, 'Asinha de frango', 'Completa com acompanhamentos', 27.00),
(54, 5, 'Picanha 180g', 'Completa com acompanhamentos', 43.00),
(55, 5, 'Filé mignon', 'Completa com acompanhamentos', 31.00),
(56, 5, 'Cupim', 'Completa com acompanhamentos', 29.00),
(57, 5, 'Filé de frango', 'Completa com acompanhamentos', 25.00),

-- SALADAS
(58, 6, 'Salada Tropical', 'Alface, tomate cereja, maçã, palmito e manga', 40.00),
(59, 6, 'Salada Especial', 'Azeitona, palmito, cebola roxa, alface e tomate', 35.00),
(60, 6, 'Salada de Guariroba', '', 35.00),

-- CALDOS
(61, 7, 'Caldo de Feijão', '', 20.00),
(62, 7, 'Vaca atolada', '', 20.00),
(63, 7, 'Caldo de Frango', '', 20.00),

-- PORÇÕES
(64, 8, 'Picanha à palito 500g (completa)', 'Com arroz, feijão, cebola, mandioca e tomate', 99.00),
(65, 8, 'Picanha à palito 500g (simples)', 'Com cebola, mandioca e tomate', 85.00),
(66, 8, 'Frango a passarinho 1kg', 'Com arroz, feijão tropeiro, tomate e mandioca', 60.00),
(67, 8, 'Isca de peixe tilápia 500g', 'Com arroz e vinagrete', 70.00),
(68, 8, 'Frango a passarinho', 'Porção', 49.00),
(69, 8, 'Isca de peixe tilápia', 'Porção', 60.00),
(70, 8, 'Meia isca de peixe', '', 40.00),
(71, 8, 'Batata frita', '', 25.00),
(72, 8, 'Batata especial', '', 35.00),
(73, 8, 'Kibe com queijo', '', 25.00),
(74, 8, 'Bolinha de queijo', '', 30.00),
(75, 8, 'Bolinha de bacalhau', '', 45.00),
(76, 8, 'Bolinho de arroz', '', 25.00),
(77, 8, 'Torresmo com mandioca 500g', '', 30.00),
(78, 8, 'Ceviche', '', 30.00),
(79, 8, 'Meio ceviche', '', 20.00),
(80, 8, 'Ceviche de guariroba', '', 30.00),
(81, 8, 'Arroz (extra)', '', 9.00),
(82, 8, 'Feijão (extra)', '', 9.00),
(83, 8, 'Vinagrete (extra)', '', 6.00),
(84, 8, 'Mandioca (extra)', '', 9.00),
(85, 8, 'Mandioca frita (extra)', '', 10.00),

-- CERVEJAS
(86, 9, 'Antarctica', 'Lata', 11.00),
(87, 9, 'Skol', 'Lata', 11.00),
(88, 9, 'Brahma Duplo Malte', 'Lata', 11.00),
(89, 9, 'Brahma', 'Lata', 11.00),
(90, 9, 'Original', 'Garrafa', 13.00),
(91, 9, 'Budweiser', 'Lata', 14.00),
(92, 9, 'Amstel', 'Lata', 14.00),
(93, 9, 'Heineken', 'Lata', 17.00),

-- LONG NECK
(94, 10, 'Brahma Zero', 'Long Neck', 10.00),
(95, 10, 'Heineken Zero', 'Long Neck', 12.00),
(96, 10, 'Heineken', 'Long Neck', 12.00),
(97, 10, 'Heineken 250ml', 'Long Neck', 10.00),
(98, 10, 'Michelob', 'Long Neck', 10.00),
(99, 10, 'Brahma Malzbier', 'Long Neck', 12.00),
(100, 10, 'Corona', 'Long Neck', 12.00),
(101, 10, 'Spaten', 'Long Neck', 8.00),

-- REFRIGERANTES
(102, 11, 'Coca-Cola Zero LT', '', 8.00),
(103, 11, 'Coca-Cola LT/KS', '', 8.00),
(104, 11, 'Coca-Cola 600ml', '', 10.00),
(105, 11, 'Coca-Cola 600ml Zero', '', 11.00),
(106, 11, 'Coca-Cola 1L', '', 12.00),
(107, 11, 'Coca-Cola 1L Zero', '', 14.00),
(108, 11, 'Coca-Cola 2L', '', 15.00),
(109, 11, 'Coca-Cola 2L Zero', '', 17.00),
(110, 11, 'Guaraná lata/KS', '', 8.00),
(111, 11, 'Guaraná Zero LT', '', 8.00),
(112, 11, 'Guaraná 1L', '', 12.00),
(113, 11, 'Guaraná 2L Zero', '', 15.00),
(114, 11, 'Água tônica', '', 8.00),
(115, 11, 'Água tônica Zero', '', 8.00),
(116, 11, 'Soda', '', 8.00),
(117, 11, 'Fanta', '', 8.00),

-- BEBIDAS
(118, 12, 'H2O', '', 9.00),
(119, 12, 'Smirnoff Ice', '', 14.00),
(120, 12, 'Caipirinha', '', 12.00),
(121, 12, 'Caipirosca', '', 15.00),
(122, 12, 'Preparo Cozumel', '', 8.00),
(123, 12, 'Água sem gás', '', 5.00),
(124, 12, 'Água com gás', '', 6.00),
(125, 12, 'Energético Extra Power', '', 12.00),
(126, 12, 'Red Bull', '', 16.00),

-- SUCOS
(127, 13, 'Jarra de suco', 'Frutas: laranja, morango, limão / Polpas disponíveis', 17.00),
(128, 13, 'Copo de creme', '', 15.00),
(129, 13, 'Suco no copo', 'Frutas: laranja, morango, limão / Polpas disponíveis', 9.00),
(130, 13, 'Polpa adicional', '', 5.00);

```

---

## 📄 Arquivo: src\index.js
```js
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
            try { await db.pool.query('ALTER TABLE pedidos ADD COLUMN tipo_pedido VARCHAR(50)'); } catch(e) {}
            try { await db.pool.query('ALTER TABLE pedidos ADD COLUMN endereco_entrega TEXT'); } catch(e) {}
            try { await db.pool.query('ALTER TABLE pedidos ADD COLUMN forma_pagamento VARCHAR(50)'); } catch(e) {}
            console.log("✅ Banco de Dados sincronizado com o CRM Pro.");
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

```

---

## 📄 Arquivo: src\init.js
```js
const { initDB } = require('./config/db');

console.log("Inicializando configuração do Banco de Dados...");
initDB().then(() => {
    setTimeout(() => {
        console.log("Processo finalizado.");
        process.exit(0);
    }, 1000);
}).catch(err => {
    console.error(err);
    process.exit(1);
});

```

---

## 📄 Arquivo: src\server.js
```js
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');

const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await db.pool.query('SELECT p.*, c.nome as categoria_nome FROM produtos p JOIN categorias c ON p.categoria_id = c.id ORDER BY c.id, p.nome');
        res.json(rows);
    } catch (e) {
        console.error("Erro ao buscar produtos:", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/products/toggle/:id', async (req, res) => {
    try {
        await db.pool.query('UPDATE produtos SET disponivel = NOT disponivel WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        console.error("Erro no toggle de produto:", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/recent-orders', async (req, res) => {
    try {
        const [rows] = await db.pool.query(`
            SELECT p.id, p.total, p.tipo_pedido, p.endereco_entrega, p.forma_pagamento, p.criado_em,
            (SELECT GROUP_CONCAT(CONCAT(ip.quantidade, 'x ', pr.nome) SEPARATOR ', ') 
             FROM itens_pedido ip 
             JOIN produtos pr ON ip.produto_id = pr.id 
             WHERE ip.pedido_id = p.id) as itens
            FROM pedidos p
            ORDER BY p.criado_em DESC
            LIMIT 10
        `);
        res.json(rows);
    } catch (e) {
        console.error("Erro ao buscar pedidos:", e.message);
        res.status(500).json({ error: "Erro ao buscar pedidos" });
    }
});

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

```

---


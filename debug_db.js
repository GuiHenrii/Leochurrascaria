require('dotenv').config();
const db = require('./src/config/db');

async function debug() {
    try {
        const [rows] = await db.pool.query('SELECT p.id as pid, p.cliente_id, c.id as cid, c.nome, p.cliente_fone FROM pedidos p LEFT JOIN clientes c ON p.cliente_id = c.id ORDER BY p.id DESC LIMIT 3');
        console.log("PEDIDOS RECENTES JOIN CLIENTES:", rows);
        
        const [itens] = await db.pool.query('SELECT p.id, p.nome, c.nome as cat FROM produtos p JOIN categorias c ON p.categoria_id = c.id WHERE p.nome LIKE "%Frango%" OR p.nome LIKE "%Alcatra%"');
        console.log("ITENS NO DB:", itens);
    } catch(e) {
        console.error("ERRO:", e);
    } finally {
        process.exit();
    }
}
debug();

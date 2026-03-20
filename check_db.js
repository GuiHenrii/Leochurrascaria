const db = require('./src/config/db');

async function check() {
    try {
        const [cats] = await db.pool.query('SELECT * FROM categorias');
        console.log("CATEGORIAS NO BANCO:", cats);
        const [prods] = await db.pool.query('SELECT count(*) as total FROM produtos');
        console.log("TOTAL DE PRODUTOS:", prods[0].total);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();

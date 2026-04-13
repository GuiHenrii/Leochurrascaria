const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
    console.log('--- TESTANDO CONEXÃO COM O BANCO ---');
    console.log('Host:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USER);
    console.log('DB:', process.env.DB_NAME);

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });
        console.log('✅ Conexão estabelecida com sucesso!');

        const [rows] = await connection.query('SELECT COUNT(*) as total FROM produtos');
        console.log(`✅ Consulta OK! Total de produtos no banco: ${rows[0].total}`);

        const [catRows] = await connection.query('SELECT COUNT(*) as total FROM categorias');
        console.log(`✅ Consulta OK! Total de categorias no banco: ${catRows[0].total}`);

        await connection.end();
        console.log('--- TESTE FINALIZADO COM SUCESSO ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ ERRO NA CONEXÃO:', err.message);
        process.exit(1);
    }
}

testConnection();

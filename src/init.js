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


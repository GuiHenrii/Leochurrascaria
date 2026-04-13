const aiService = require('./src/services/ai.service');
const db = require('./src/config/db');

async function simulateOrder() {
    console.log('🚀 INICIANDO SIMULAÇÃO DE PEDIDO (HOMOLOGAÇÃO)');
    const phone = '5511999999999@c.us';

    const transcript = [
        "Olá, bom dia!",
        "Quero uma Jantinha de Franbacon e uma Coca 2L",
        "Somente isso",
        "Vou retirar aí"
    ];

    try {
        for (const msg of transcript) {
            console.log(`\n👤 [CLIENTE]: ${msg}`);
            const result = await aiService.processMessage(phone, msg);
            console.log(`🤖 [LÉO]: ${result.replyText}`);
        }

        console.log('\n✅ SIMULAÇÃO CONCLUÍDA COM SUCESSO!');
        process.exit(0);
    } catch (err) {
        console.error('❌ ERRO NA SIMULAÇÃO:', err.message);
        process.exit(1);
    }
}

simulateOrder();

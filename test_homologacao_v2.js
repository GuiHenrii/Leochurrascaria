const aiService = require('./src/services/ai.service');
const db = require('./src/config/db');

async function simulateOrderV2() {
    console.log('🚀 INICIANDO TESTE DE ESTRESSE (HOMOLOGAÇÃO V2)');
    const phone = '5511888888888@c.us';

    const transcript = [
        "Boa noite! Quero 2 Jantinhas de Alcatra e 1 Heineken Long Neck gelada.",
        "É para entrega na Rua das Oliveiras, 150.",
        "Sim, o resumo está certo. Vou pagar no Pix.",
        "Pode finalizar."
    ];

    try {
        for (const msg of transcript) {
            console.log(`\n👤 [CLIENTE]: ${msg}`);
            const result = await aiService.processMessage(phone, msg);
            console.log(`🤖 [LÉO]: ${result.replyText}`);
            
            if (result.isOrderCompleted) {
                console.log('\n📦 [DADOS DO PEDIDO]:', JSON.stringify(result.orderData, null, 2));
            }
        }

        console.log('\n✅ TESTE V2 CONCLUÍDO!');
        process.exit(0);
    } catch (err) {
        console.error('❌ ERRO NA SIMULAÇÃO V2:', err.message);
        process.exit(1);
    }
}

simulateOrderV2();

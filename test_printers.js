const { printOrder } = require('./src/services/printer.service');

async function testMultiplePrinters() {
    console.log('🚀 INICIANDO TESTE DE MÚLTIPLAS IMPRESSORAS');
    
    const mockOrderDetails = `
ITEM TESTE: 1x Picanha na Brasa
ACOMPANHAMENTO: Arroz e Feijão Tropeiro
BEBIDA: 1x Coca-Cola 2L
TOTAL: R$ 125.00
--------------------------------
ESTE É UM TESTE DE CONECTIVIDADE
DAS IMPRESSORAS .201 E .202
    `.trim();

    try {
        const success = await printOrder('999-TESTE', mockOrderDetails);
        
        if (success) {
            console.log('\n✅ TESTE CONCLUÍDO!');
            console.log('Se nada saiu no papel, verifique os IPs e a porta 9100.');
        } else {
            console.log('\n❌ FALHA TOTAL: Nenhuma impressora respondeu.');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('❌ ERRO NO SCRIPT DE TESTE:', err.message);
        process.exit(1);
    }
}

testMultiplePrinters();

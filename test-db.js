const db = require('./src/config/db'); // Ajuste o caminho se necessário
const orderService = require('./src/services/order.service');

async function testarFluxoCompleto() {
    console.log("🚀 Iniciando teste de banco de dados...");

    try {
        // 1. Testa a conexão básica
        const [rows] = await db.pool.query('SELECT 1 + 1 AS result');
        console.log("✅ Conexão com MySQL: OK");

        // 2. Simula os dados que a IA enviaria para o OrderService
        // IMPORTANTE: Use um telefone que já exista na sua tabela 'clientes'
        const dadosSimulados = {
            cliente_fone: '5562000000000', // NOVO NÚMERO PARA TESTAR CRIAÇÃO DE CLIENTE
            resumo_itens: "📄 *TESTE DE SISTEMA*\n• 1x Franbacon (Jantinha) — R$ 25.00\n• 1x Coca-Cola — R$ 8.00\n\n💰 *TOTAL: R$ 33.00*",
            total: 33.00,
            observacao: "Teste de integração sem WhatsApp",
            itens: [
                { produto_id: 42, quantidade: 1, preco_unitario: 25.00 }, // ID do Franbacon
                { produto_id: 10, quantidade: 1, preco_unitario: 8.00 }   // ID de uma bebida
            ]
        };

        console.log("📝 Tentando salvar pedido de teste...");
        const pedidoId = await orderService.criarPedido(dadosSimulados);

        console.log(`\n✨ SUCESSO ABSOLUTO!`);
        console.log(`🆔 Pedido gerado: #${pedidoId}`);
        console.log(`📂 Verifique agora no seu MySQL: SELECT * FROM pedidos WHERE id = ${pedidoId};`);

    } catch (error) {
        console.error("\n❌ FALHA NO TESTE:");
        console.error("Mensagem:", error.message);

        if (error.message.includes("not found") || error.message.includes("encontrado")) {
            console.log("\n💡 DICA: O erro acima aconteceu porque o telefone no 'cliente_fone' não existe na tabela 'clientes'. Cadastre o número no banco e tente de novo!");
        }
    } finally {
        process.exit();
    }
}

testarFluxoCompleto();
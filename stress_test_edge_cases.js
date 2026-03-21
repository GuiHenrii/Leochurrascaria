const aiService = require('./src/services/ai.service');

async function simulateScenario(phone, messages, description) {
    console.log(`\n▶️ INICIANDO CENÁRIO: ${description} (Tel: ${phone})`);
    
    for (const msg of messages) {
        console.log(`\n[👤 Cliente ${phone}]: ${msg}`);
        try {
            const result = await aiService.processMessage(phone, msg);
            console.log(`[🤖 Léo ${phone}]: ${result.replyText}`);
            
            if (result.isOrderCompleted) {
                console.log(`\n✅ [PEDIDO FINALIZADO - ${phone}] Dados:`, JSON.stringify(result.orderData, null, 2));
                break;
            }
        } catch (error) {
            console.error(`\n❌ ERRO NO CENÁRIO ${description}:`, error.message);
        }
        // Small delay between messages within the same scenario
        await new Promise(r => setTimeout(r, 2000));
    }
}

async function runTest() {
    console.log("🔥 INICIANDO TESTE DE ESTRESSE: EDGE CASES (CASOS EXTREMOS) 🔥\n");
    
    const scenarios = [
        {
            phone: '5562900001001',
            desc: "1. LOCAÇÃO GPS + Fila de Complemento",
            msgs: [
                "Oi Leo, quero 2 espetinhos de frango com bacon simples.",
                "Pra entrega, por favor.",
                "[LOCALIZAÇÃO GPS]: Rua 10 - Centro (Goiânia) | Maps: https://maps.google.com/...",
                "Isso, quadra 5 lote 10",
                "Vou pagar no Cartão",
                "Pode confirmar!"
            ]
        },
        {
            phone: '5562900001002',
            desc: "2. Ambiguidade Extrema (Alcatra) + Troca Fina",
            msgs: [
                "Me ve 2 alcatra",
                "Jantinha!",
                "E um provolone",
                "Espetinho simples de provolone",
                "Vou comer ai, mesa 5",
                "Dinheiro",
                "Pode confirmar!"
            ]
        },
        {
            phone: '5562900001003',
            desc: "3. Coca-Cola Múltipla + Retirada",
            msgs: [
                "Quero uma coca",
                "Zero, em lata",
                "E um cupim jantinha",
                "Vou passar aí pra pegar",
                "No Pix",
                "Pode confirmar!"
            ]
        },
        {
            phone: '5562900001004',
            desc: "4. Caos Extremo (Cancelamento no meio do pedido + GPS cego)",
            msgs: [
                "Quero 5 jantinhas de cupim e 3 heineken",
                "Espera, cancela a heineken, bota 3 coca lata normais",
                "Pra entregar!",
                "[LOCALIZAÇÃO GPS]: Coordenadas recebidas | Maps: geo:...", // Cego, sem rua
                "Dinheiro, troco pra 200",
                "Confirmo, pode fechar!"
            ]
        }
    ];

    // Run sequentially to prevent Groq API rate limits (HTTP 429) & clearly view conversation flows
    for (const s of scenarios) {
        await simulateScenario(s.phone, s.msgs, s.desc);
        console.log("\n-------------------------------------------------------------");
        await new Promise(r => setTimeout(r, 3000));
    }
    
    console.log("\n🏁 BATERIA DE TESTES EDGE CASES FINALIZADA!");
    process.exit(0);
}

runTest();

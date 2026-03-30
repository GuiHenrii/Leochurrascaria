require('dotenv').config();

// ==========================================
// MOCK DO WHATSAPP-WEB.JS PARA TESTE HEADLESS
// ==========================================
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(request) {
    if (request === 'whatsapp-web.js') {
        return {
            Client: class {
                constructor() { this.info = { pushname: 'Bot Léo Teste' }; }
                on(event, cb) { 
                    if (!this.callbacks) this.callbacks = {};
                    this.callbacks[event] = cb;
                }
                initialize() {}
                async sendMessage(to, textOrLocation) { 
                    if (global.onWhatsAppMessage) global.onWhatsAppMessage(to, textOrLocation);
                    return { id: { _serialized: "mock_id_" + Date.now() } }; 
                }
            },
            LocalAuth: class {},
            Location: class { 
                constructor(lat, lng, desc) { 
                    this.lat = lat; 
                    this.lng = lng; 
                    this.description = desc; 
                    this.isLocation = true;
                } 
            }
        };
    }
    return originalRequire.apply(this, arguments);
};

// ==========================================
// IMPORTAÇÕES REAIS DO PROJETO
// ==========================================
const wpService = require('./src/services/whatsapp.service');
const orderService = require('./src/services/order.service');
const aiService = require('./src/services/ai.service');
const db = require('./src/config/db');

// ==========================================
// ORQUESTRADOR DE EVENTOS V7
// ==========================================
const botReplies = [];
global.onWhatsAppMessage = async (to, content) => {
    let fmtContent = content;
    if (content && content.isLocation) {
        fmtContent = `[LBS LOCATION PIN] Lat: ${content.lat}, Lng: ${content.lng} - ${content.description}`;
    }
    console.log(`\n\x1b[32m[BOT -> ${to}]\x1b[0m:\n${fmtContent}`);
    botReplies.push({ to, content });
};

async function sendMockUser(from, text) {
    const start = performance.now();
    console.log(`\n\x1b[36m[USER ${from}]\x1b[0m: ${text}`);
    
    botReplies.length = 0; // zera as respostas anteriores neste turno

    // Cria o objeto de mensagem mockado suportando métodos primitivos do WWeb.js
    const msg = {
        from: from,
        body: text,
        getContact: async () => ({ pushname: 'Test Client', number: from.split('@')[0] })
    };
    
    // Injeta na artéria principal do robô!
    await wpService.client.callbacks['message'](msg);
    
    const end = performance.now();
    console.log(`\x1b[33m⏱️ Tempo de processamento: ${(end - start).toFixed(2)} ms\x1b[0m`);
    
    // Intervalo de segurança humano para requisições de API na Groq (rate limit protection)
    await new Promise(r => setTimeout(r, 1000));
    
    return [...botReplies];
}

// ==========================================
// BATERIA EXTREMA V7
// ==========================================
async function runTests() {
    console.log("\n🔥 INICIANDO TESTE BRUTAL V7 OMNI 🔥");
    console.log("Mocking Engine Ativado. Preparando DB e IA...\n");

    try {
        await db.pool.query("SELECT 1");
        console.log("✅ Banco de Dados Acessado com Sucesso!");
    } catch (e) {
        console.error("❌ Erro fatal no DB. Verifique o XAMPP/MySQL.", e);
        process.exit(1);
    }

    // O próprio ai.service carrega sob demanda. Em frente!

    console.log("\n=======================================================");
    console.log("CENÁRIO 1: O Teste de Colisão Groq (300 Itens) + Lógica de Troco");
    console.log("=======================================================");
    const usr1 = 'TESTE300@c.us';
    
    let rep = await sendMockUser(usr1, 'oi');
    if (rep.some(r => typeof r.content === 'string' && r.content.includes('1️⃣'))) {
        await sendMockUser(usr1, '1'); // Limpa a sessão se tiver resíduo no BD de hoje
    }
    
    await sendMockUser(usr1, 'quero 300 jantinhas de frango com bacon e 10 jarras de suco de laranja');
    await sendMockUser(usr1, 'sabor do suco seria laranja normal. nada mais');
    await sendMockUser(usr1, 'quero que entregue');
    await sendMockUser(usr1, 'rua dos pinheiros lote 5 qd 10 centro');
    await sendMockUser(usr1, 'sim, tudo correto o resumo');
    await sendMockUser(usr1, 'vou pagar no dinheiro');
    
    // Forçando o processamento lógico da IA para matemática absurda
    await sendMockUser(usr1, 'pode mandar troco pra 1 milhao de reais hahaha brincadeira, troco pra notas de cem, dão uns dez mil reais');
    // Obs: A Llama lidará com sarcasmo. Veremos o que ela põe no resumo!
    
    // Validação de Spooler Imédia
    console.log("\n🖨️ VALIDANDO SPOOLER LOCAL DA CAMADA 1...");
    const [pendentes] = await db.pool.query("SELECT * FROM pedidos WHERE impresso = 0 AND cliente_fone = ?", [usr1]);
    if (pendentes.length > 0) {
        console.log(`\x1b[32m[PASSOU]\x1b[0m Pedido #1 (O Groq de 300 itens) desceu pra tabela perfeitamente!`);
        console.log(`Tamanho do Resumo de Impressão (Bytes): ${Buffer.byteLength(pendentes[0].resumo_itens, 'utf8')}`);
        // Limpa para não floodar impressoras reais
        await db.pool.query("UPDATE pedidos SET impresso = 1 WHERE id = ?", [pendentes[0].id]);
    } else {
        console.error(`\x1b[31m[FALHOU]\x1b[0m Pedido de 300 itens não gerou no BD!`);
    }

    console.log("\n=======================================================");
    console.log("CENÁRIO 2: Interceptação REST API (CRM Desligando Estoque Vivo)");
    console.log("=======================================================");
    const usr2 = 'TESTECRM@c.us';
    
    rep = await sendMockUser(usr2, 'oi');
    if (rep.some(r => typeof r.content === 'string' && r.content.includes('1️⃣'))) { await sendMockUser(usr2, '1'); }

    // Simulação do Painel desativando picanha:
    console.log("👨‍💻 CRM WEB: Update disponivel=0 para 'picanha'...");
    await db.pool.query("UPDATE produtos SET disponivel = 0 WHERE nome LIKE '%picanha%'");

    await sendMockUser(usr2, 'quero 2 jantinhas de picanha');
    
    console.log("👨‍💻 CRM WEB: Update disponivel=1 (Restaurando)...");
    await db.pool.query("UPDATE produtos SET disponivel = 1 WHERE nome LIKE '%picanha%'");
    
    console.log("\n=======================================================");
    console.log("CENÁRIO 3: GPS Geográfico Oculto e Modalidade Retirada");
    console.log("=======================================================");
    const usr3 = 'TESTEGPS@c.us';
    rep = await sendMockUser(usr3, 'qual o endereco de vcs?');
    if (rep.some(r => typeof r.content === 'string' && r.content.includes('[LBS LOCATION PIN]'))) {
        console.log(`\x1b[32m[PASSOU]\x1b[0m Bot respondeu nativamente via GPS Location Pin (Zero Tokens IA)!`);
    } else {
        console.error(`\x1b[31m[FALHOU]\x1b[0m Falha ao enviar Location Obj do Maps.`);
    }

    await sendMockUser(usr3, 'quero um espetão de 500g e uma jantinha simples de contra filé');
    await sendMockUser(usr3, 'apenas isso de item');
    await sendMockUser(usr3, 'retirada');
    await sendMockUser(usr3, 'sim, fechado');
    await sendMockUser(usr3, 'pix');

    // Validação Spooler
    const [pend3] = await db.pool.query("SELECT * FROM pedidos WHERE impresso = 0 AND cliente_fone = ?", [usr3]);
    if (pend3.length > 0) {
        console.log(`\x1b[32m[PASSOU]\x1b[0m Pedido Retirada+Pix #3 Inserido. Troco registrado: ${pend3[0].troco}`);
        await db.pool.query("UPDATE pedidos SET impresso = 1 WHERE id = ?", [pend3[0].id]);
    }

    console.log("\n=======================================================");
    console.log("CENÁRIO 4: Teste Anti-Bypass Triagem (Sessão Limpa vs Trava Pós-Venda)");
    console.log("=======================================================");
    const usr4 = 'TESTELOCK@c.us';
    
    // Fecha um pedido ultra rapido pra ativar a trava
    await sendMockUser(usr4, 'ola');
    if (rep.some(r => typeof r.content === 'string' && r.content.includes('1️⃣'))) { await sendMockUser(usr4, '1'); }
    await sendMockUser(usr4, '1 jantinha simples');
    await sendMockUser(usr4, 'mesa');
    await sendMockUser(usr4, 'sim');
    await sendMockUser(usr4, 'dinheiro');
    await sendMockUser(usr4, 'sem troco');
    
    // O pedido dele terminou! `sessaoPosVendaLiberada` para ELE DEVE ESTAR DELETADA!
    // Ele manda oi no mesmo dia:
    rep = await sendMockUser(usr4, 'oi de novo!');
    if (rep.some(r => typeof r.content === 'string' && r.content.includes('1️⃣'))) {
        console.log(`\x1b[32m[PASSOU]\x1b[0m Sistema bloqueou corretamente a reabertura! Acionou Menu de Triagem.`);
    } else {
        console.error(`\x1b[31m[FALHOU]\x1b[0m O Llama-3 atendeu a pessoa diretamente após um fechamento de venda! O Bypass não fechou.`);
    }

    console.log("\n🚀 FINALIZADO! Todos os testes de extresse da arquitetura do Projeto foram limpos.");
    process.exit(0);
}

runTests();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const aiService = require('./ai.service');
const orderService = require('./order.service');
const db = require('../config/db');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

// ============================================================
// CACHE em memória — zero BD e zero tokens repetidos
// ============================================================
const menuCache = {
    categorias: null,
    textoCategorias: null,
    textoPorCategoriaId: {}
};

async function carregarCategorias() {
    if (menuCache.categorias) return menuCache.categorias;
    const [rows] = await db.pool.query('SELECT id, nome FROM categorias ORDER BY id');
    menuCache.categorias = rows;

    // Menu exibido ao cliente: apenas nomes, sem números
    let txt = '🍖 *Cardápio Léo Churrascaria* 🍖\n\n';
    txt += 'Escolha uma categoria abaixo (é só digitar o nome!):\n\n';
    rows.forEach(c => { txt += `🍢 ${c.nome}\n`; });
    txt += '\nOu já me diz o que vai querer que eu anoto! 😄';
    menuCache.textoCategorias = txt;
    return rows;
}

async function getTextoCategoria(catId, catNome) {
    if (menuCache.textoPorCategoriaId[catId]) return menuCache.textoPorCategoriaId[catId];
    const [itens] = await db.pool.query(
        'SELECT nome, preco, descricao FROM produtos WHERE categoria_id = ? AND disponivel = 1',
        [catId]
    );
    let txt = `🍢 *${catNome}*\n`;
    txt += '──────────────────────\n';
    itens.forEach(p => {
        const pc = p.preco > 0 ? `R$ ${Number(p.preco).toFixed(2)}` : 'CONSULTAR';
        txt += `• ${p.nome} — *${pc}*`;
        if (p.descricao && p.descricao.trim()) {
            txt += `\n  _${p.descricao}_`;
        }
        txt += '\n';
    });
    txt += '\n_Para pedir é só me dizer! Ex: "Quero 2 Picanha 180g"_ 🥩';
    menuCache.textoPorCategoriaId[catId] = txt;
    return txt;
}

// Detecta se o cliente está pedindo uma categoria específica por nome
async function detectarCategoria(texto) {
    const cats = await carregarCategorias();
    const textoLower = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    for (const cat of cats) {
        const nomeNorm = cat.nome.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .split('(')[0].trim(); // Remove "(serve X pessoas)"

        // Palavras-chave da categoria
        const palavras = nomeNorm.split(' ').filter(p => p.length > 3);
        const match = palavras.some(p => textoLower.includes(p));
        
        if (match && texto.length < 60) {
            // Não confundir com um pedido real ("quero pedir espetinho de X")
            const ehPedido = /(quero|pedir|me d[aá]|traz|adiciona|coloca|vou querer)\s+\d/i.test(texto);
            if (!ehPedido) return cat;
        }
    }
    return null;
}

// ============================================================
// EVENTOS DO WHATSAPP
// ============================================================
client.on('qr', (qr) => {
    console.log('\n======================================================');
    console.log('📱 ESCANEIE O QR CODE ABAIXO PARA CONECTAR O WHATSAPP:');
    console.log('======================================================');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp Bot conectado e pronto para receber pedidos!');
    carregarCategorias().catch(console.error); // Aquece o cache no boot
});

client.on('message', async msg => {
    if (!msg.from || msg.from === 'status@broadcast' || msg.from.includes('@g.us')) return;

    let textToProcess = msg.body;

    // ---- Processamento de Áudio e Imagem ----
    if (msg.hasMedia) {
        try {
            const media = await msg.downloadMedia();
            if (media) {
                if (media.mimetype.includes('audio') || media.mimetype.includes('ptt')) {
                    const transcription = await aiService.transcribeAudio(media.data);
                    console.log(`[Áudio Transcrito] <${msg.from}>: ${transcription}`);
                    textToProcess = transcription;
                } else if (media.mimetype.includes('image')) {
                    const description = await aiService.describeImage(media.data, media.mimetype);
                    console.log(`[Imagem Lida] <${msg.from}>: ${description}`);
                    textToProcess = ((msg.body ? msg.body + " \n" : "") + description).trim();
                }
            }
        } catch (err) {
            console.error("Erro ao processar mídia:", err.message);
        }
    }

    if (!textToProcess) return;
    console.log(`[Mensagem] <${msg.from}>: ${textToProcess}`);

    // ---- Saudação inicial (zero tokens) ----
    const ehSaudacao = /^(ol[aá]|oi|bom dia|boa tarde|boa noite|e a[ií]|tudo|salve|hey|hi|bl[aá]|fala)[\s!?.,]*$/i.test(textToProcess.trim());
    if (ehSaudacao) {
        await carregarCategorias();
        await client.sendMessage(msg.from,
            '🍖 Olá! Seja bem-vindo(a) à *Léo Churrascaria*! Que bom te ver! 😄\n\n' +
            menuCache.textoCategorias
        );
        return;
    }

    // ---- Pedido de cardápio/menu (zero tokens) ----
    const pedindoMenu = /(card[aá]pio|cardapio|menu|o que tem|op[cç][oõ]es|ver pratos|listar|o que voc[eê]s)/i.test(textToProcess);
    if (pedindoMenu) {
        await carregarCategorias();
        await client.sendMessage(msg.from, menuCache.textoCategorias);
        return;
    }

    // ---- Seleção de categoria por nome (zero tokens) ----
    const catDetectada = await detectarCategoria(textToProcess);
    if (catDetectada) {
        const txtCat = await getTextoCategoria(catDetectada.id, catDetectada.nome);
        await client.sendMessage(msg.from, txtCat);
        return;
    }

    // ---- Fluxo de IA (pedidos reais e checkout) ----
    const result = await aiService.processMessage(msg.from, textToProcess);

    if (result.replyText) {
        await client.sendMessage(msg.from, result.replyText);
    }

    if (result.isOrderCompleted && result.orderData) {
        const success = await orderService.processNewOrder(msg.from, result.orderData);
        if (!success) {
            await client.sendMessage(msg.from, "⚠️ Houve uma falha interna ao salvar seu pedido. Por favor, avise um atendente.");
        }
    }
});

function init() {
    console.log("Iniciando cliente do WhatsApp...");
    client.initialize();
}

module.exports = { init };

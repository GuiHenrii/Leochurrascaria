const { Client, LocalAuth, Location } = require('whatsapp-web.js');
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
        
        if (match) {
            const tokens = textoLower.split(/\s+/).filter(t => t.length > 0);
            
            // Se tiver mais de 2 palavras (ex: "uma jantinha de contra"), NÃO é apenas seleção de menu.
            // É um pedido real ou frase complexa. Deixamos a IA agir.
            if (tokens.length > 2) continue;

            // Se tiver termos de ação mesmo em frases curtas, também ignoramos.
            const ehPedidoReal = /(quero|queria|me da|vou de|traz|pedir|uma?|tem)\s+/i.test(textoLower);
            if (!ehPedidoReal) return cat;
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

    // ---- Processamento de Mídia e Localização ----
    if (msg.type === 'location' && msg.location) {
        const { latitude, longitude } = msg.location;
        const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        
        // Tenta geocodificação reversa (coordenadas para endereço real)
        let enderecoReal = "";
        try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
                headers: { 'User-Agent': 'ChurrascariaBot/1.0' }
            });
            const geoData = await geoRes.json();
            if (geoData && geoData.address) {
                const { road, suburb, city, house_number } = geoData.address;
                enderecoReal = `${road || 'Rua'}${house_number ? ', ' + house_number : ''} - ${suburb || ''} (${city || ''})`;
            }
        } catch (e) {
            console.error("Geocoding fail:", e.message);
        }

        textToProcess = `[LOCALIZAÇÃO GPS]: ${enderecoReal || 'Coordenadas recebidas'} | Maps: ${mapUrl}`;
        console.log(`[Localização] <${msg.from}>: ${textToProcess}`);
    } else if (msg.hasMedia) {
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

    // Garante que o cliente existe no sistema já com o seu nome real
    try {
        let pushName = msg._data?.notifyName || "Cliente";
        if (pushName === "Cliente" || !pushName) {
            const contact = await msg.getContact();
            if (contact) pushName = contact.name || contact.pushname || "Cliente";
        }
        if (pushName && pushName.trim() !== '') {
            await db.pool.query('INSERT IGNORE INTO clientes (telefone, nome) VALUES (?, ?)', [msg.from, pushName]);
            // Atualiza o nome caso a tabela já tenha criado lixo (null) antes
            await db.pool.query('UPDATE clientes SET nome = ? WHERE telefone = ? AND (nome IS NULL OR nome = "Cliente" OR nome = "")', [pushName, msg.from]);
        }
    } catch(e) {}

    // ---- Saudação inicial (zero tokens) ----
    const ehSaudacao = /^(ol[aá]|oi|bom dia|boa tarde|boa noite|e a[ií]|tudo|salve|hey|hi|bl[aá]|fala)[\s!?.,]*$/i.test(textToProcess.trim());
    if (ehSaudacao) {
        aiService.initSession(msg.from); // Abre sessão para o próximo pedido não ser interceptado pelo menu
        await carregarCategorias();
        await client.sendMessage(msg.from,
            '🍖 Olá! Seja bem-vindo(a) à *Léo Churrascaria*! Que bom te ver! 😄\n\n' +
            menuCache.textoCategorias
        );
        return;
    }

    // ---- Pedido de cardápio/menu (zero tokens) ----
    const pedindoMenu = /^(card[aá]pio|cardapio|menu|listar|itens)$/i.test(textToProcess.trim());
    if (pedindoMenu) {
        await carregarCategorias();
        await client.sendMessage(msg.from, menuCache.textoCategorias);
        return;
    }

    // ---- Pedido de Localização (Map Pin Automático) ----
    const textNorm = textToProcess.trim().toLowerCase();
    const soPedindoLocal = /^((voc[eê]s )?(me )?)?(onde fica|onde voc[eê]s est[aã]o|qual (é )?o endere[cç]o|manda a localiza[cç][aã]o|localiza[cç][aã]o|endere[cç]o|como chegar)[\s!?.,]*$/i.test(textNorm);
    const contemPedidoLocal = /(onde fica\??|onde voc[eê]s est[aã]o\??|qual (é )?o endere[cç]o\??|manda a localiza[cç][aã]o|como chegar\??)/i.test(textNorm);

    if (contemPedidoLocal || soPedindoLocal) {
        try {
            const loc = new Location(-17.746472374283766, -48.631835452859654, { name: 'Léo Churrascaria', address: 'Av. Bandeirantes, Centro' });
            await client.sendMessage(msg.from, loc);
            
            if (soPedindoLocal) {
                await client.sendMessage(msg.from, '📍 Aqui está a nossa localização! É só clicar no mapa acima para abrir no GPS.\n\nSe tiver alguma dúvida sobre o pedido, estou por aqui! 😄');
                return;
            }
        } catch (err) {
            console.error("Erro ao enviar pino do mapa:", err);
            await client.sendMessage(msg.from, '📍 Nosso endereço oficial é na Av. Bandeirantes, Centro!\n\nPosso te ajudar com o pedido agora? 😄');
            if (soPedindoLocal) return;
        }
    }

    // ---- Seleção de categoria por nome (zero tokens) ----
    // SÓ detecta se for a palavra EXATA (1 token) e NÃO houver sessão ativa
    const tokens = textToProcess.trim().split(/\s+/);
    const catDetectada = (aiService.hasActiveSession(msg.from) || tokens.length > 1) ? null : await detectarCategoria(textToProcess);
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

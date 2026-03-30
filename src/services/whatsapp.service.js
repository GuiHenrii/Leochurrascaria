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

// 🔥 HOTFIX GLOBAL PARA O BUG DO WHATSAPP WEB ACTUAL (i.getLastMsgKeyForAction is not a function)
// Interceptamos o sendMessage padrão para NUNCA enviar os Checks Azuis de visualização assíncrona.
const originalSendMessage = client.sendMessage.bind(client);
client.sendMessage = async (chatId, content, options = {}) => {
    return originalSendMessage(chatId, content, { ...options, sendSeen: false });
};

const esperandoPosVenda = {}; // Memória temporária para o Pós-Venda
const sessaoPosVendaLiberada = new Set(); // Libera o fluxo para novos pedidos no mesmo dia

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

    // ---- Trava de Horário de Funcionamento (Seg-Sáb, 18:00 as 23:45) ----
    const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const dia = agora.getDay(); // 0 = Domingo
    const hora = agora.getHours();
    const minuto = agora.getMinutes();

    let aberto = true;
    let motivoFechado = "";
    if (dia === 0) {
        aberto = false; // Fecha domingo
        motivoFechado = "domingo";
    } else if (hora < 18) {
        aberto = false; // Fecha antes das 18h
        motivoFechado = "cedo";
    } else if (hora === 23 && minuto > 45) {
        aberto = false; // Fecha 23:45
        motivoFechado = "tarde";
    }

    aberto = true; // [MODO DE TESTE ATIVADO] Ignorando o bloqueio de horário

    if (!aberto) {
        if (motivoFechado === "cedo") {
            await client.sendMessage(msg.from, "⏰ Opa! Ainda estamos preparando a churrasqueira por aqui.\n\n🍗 Nosso horário de atendimento hoje começa às *18:00 e vai até as 23:45*.\n\nEstaremos te esperando mais tarde para aquele churrasco de responsa! 🥩🔥");
        } else if (motivoFechado === "tarde") {
            await client.sendMessage(msg.from, "😴 Ops! A churrasqueira já esfriou por hoje...\n\n🍗 Nosso horário de atendimento é de *Segunda a Sábado, das 18:00 às 23:45*.\n\nTe esperamos amanhã para aquele churrasco de responsa! 🥩🔥");
        } else {
            // Domingo
            await client.sendMessage(msg.from, "😴 Ops! Hoje é nosso dia de descanso e a churrasqueira folga.\n\n🍗 Nosso horário de atendimento é de *Segunda a Sábado, das 18:00 às 23:45*.\n\nTe esperamos amanhã para aquele churrasco de responsa! 🥩🔥");
        }
        return;
    }

    let textToProcess = msg.body || "";

    // ---- Processamento de Mídia e Localização ----
    if (msg.type === 'location' || msg.hasLocation) {
        let latitude, longitude;
        if (msg.location) {
            latitude = msg.location.latitude;
            longitude = msg.location.longitude;
        } else if (typeof msg.getLocation === 'function') {
            const geoloc = await msg.getLocation();
            latitude = geoloc?.latitude;
            longitude = geoloc?.longitude;
        }

        if (latitude && longitude) {
            const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
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
            textToProcess = `[LOCALIZAÇÃO GPS]: ${enderecoReal || 'Coordenadas recebidas'} | Maps: ${mapUrl} (ATENÇÃO IA: Este foi um envio de Mapa do WhatsApp. Peça para o cliente confirmar o número exato, quadra e lote, pois o GPS só nos dá o nome da rua!)`;
            console.log(`[Localização] <${msg.from}>: ${textToProcess}`);
        } else {
            textToProcess = `[LOCALIZAÇÃO GPS]: Sem coordenadas detectadas.`;
        }
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

    // ---- PÓS-VENDA (Escolha de Novo Pedido ou Suporte) ----
    if (esperandoPosVenda[msg.from]) {
        const posVenda = esperandoPosVenda[msg.from];
        const orderId = posVenda.orderId;
        const msgBody = textToProcess.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        if (msgBody === '1' || msgBody.includes('novo')) {
            delete esperandoPosVenda[msg.from];
            sessaoPosVendaLiberada.add(msg.from); // Impede que a triagem se repita neste novo fluxo!
            aiService.initSession(msg.from, true); // Força ZERO absoluto da memória passada
            await carregarCategorias();
            await client.sendMessage(msg.from, 'Maravilha! Vamos começar um novo pedido do zero. O que vai querer? 🥩🔥\n\n' + menuCache.textoCategorias);
            return;
        } else if (msgBody === '2' || msgBody.includes('falar sobre')) {
            delete esperandoPosVenda[msg.from];
            aiService.initSession(msg.from, true); // Força ZERO pra Llama esquecer a conversa velha e focar só no suporte
            aiService.injectSystemMessage(msg.from, `ATENÇÃO [COMANDO DO SISTEMA]: O cliente tem o pedido #${orderId} RECÉM-EMITIDO PARA A COZINHA! Aja como Atendente de Suporte do pedido #${orderId}. Escute o problema/reclamação/dúvida dele, responda educadamente tentando resolver ou informando que passará a solicitação para o garçom. JAMAIS diga que a entrega já acabou! Lembre-se que o tempo médio de preparo/entrega é de 30 minutos. JAMAIS tente usar a tool 'finalizar_pedido' agora.`);
            await client.sendMessage(msg.from, `Certo! O que ocorreu com o seu pedido #${orderId}? Qual a sua dúvida ou reclamação? Pode me falar que eu anoto aqui para resolvermos!`);
            return;
        } else {
            await client.sendMessage(msg.from, "Por favor, responda apenas com *1* (Novo Pedido) ou *2* (Falar sobre o meu pedido anterior).");
            return;
        }
    }

    // Se o cliente FINALIZOU um pedido recentemente (hoje) e manda uma nova mensagem para iniciar papo!
    if (!aiService.hasActiveSession(msg.from) && !sessaoPosVendaLiberada.has(msg.from)) {
        try {
            const [pedidosRecentes] = await db.pool.query(
                "SELECT id FROM pedidos WHERE cliente_fone = ? AND DATE(criado_em) = CURDATE() ORDER BY id DESC LIMIT 1",
                [msg.from]
            );
            if (pedidosRecentes.length > 0) {
                esperandoPosVenda[msg.from] = { orderId: pedidosRecentes[0].id };
                await client.sendMessage(msg.from, `👋 Olá novamente!\n\nVi que você fez o pedido *#${pedidosRecentes[0].id}* hoje conosco.\n\nDeseja realizar um novo pedido?\n\n1️⃣ Quero fazer um *novo pedido*\n2️⃣ Quero *falar sobre o pedido* #${pedidosRecentes[0].id}\n\nResponda apenas com *1* ou *2*.`);
                return; // Bloqueia tudo e espera ele escolher a opção no próximo ciclo
            }
        } catch (e) {
            console.error("Erro na verificação de Pós-Venda:", e.message);
        }
    }

    // ---- Saudação inicial (zero tokens) ----
    const ehSaudacao = /^(ol[aá]|oi|bom dia|boa tarde|boa noite|e a[ií]|tudo|salve|hey|hi|bl[aá]|fala)[\s!?.,]*$/i.test(textToProcess.trim());
    if (ehSaudacao) {
        aiService.initSession(msg.from, true); // Zera o contexto também na saudação pura se não caiu no Pós-Venda
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
            await client.sendMessage(msg.from, '📍 *Léo Churrascaria*\nAv. Bandeirantes, Centro\n\nClique no link abaixo para abrir o GPS:\nhttps://maps.google.com/?q=-17.746472374283766,-48.631835452859654');
            
            if (soPedindoLocal) {
                await client.sendMessage(msg.from, 'Se tiver alguma dúvida sobre o pedido, estou por aqui! 😄');
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
        sessaoPosVendaLiberada.delete(msg.from); // Restaura a triagem caso ele compre novamente hoje!
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

module.exports = { init, client };


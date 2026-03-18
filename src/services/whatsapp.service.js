const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const aiService = require('./ai.service');
const orderService = require('./order.service');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('\n======================================================');
    console.log('📱 ESCANEIE O QR CODE ABAIXO PARA CONECTAR O WHATSAPP:');
    console.log('======================================================');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp Bot conectado e pronto para receber pedidos!');
});

client.on('message', async msg => {
    // Ignora status ou origens difusas
    if (!msg.from || msg.from === 'status@broadcast' || msg.from.includes('@g.us')) return;

    let textToProcess = msg.body;

    // Processamento de Áudio ou Imagem (Multimodal)
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

    console.log(`[Compreensão Final da Mensagem] <${msg.from}>: ${textToProcess}`);

    // Manda para a IA Chat prosseguir a conversa
    const result = await aiService.processMessage(msg.from, textToProcess);
    
    // Responde ao usuário
    if (result.replyText) {
        await client.sendMessage(msg.from, result.replyText);
    }

    // Se a IA finalizar o pedido, acionamos o DB e Impressora
    if (result.isOrderCompleted && result.orderData) {
        const success = await orderService.processNewOrder(msg.from, result.orderData);
        if (!success) {
            await client.sendMessage(msg.from, "⚠️ Houve uma falha interna ao salvar seu pedido. Por favor, avise um atendente humano.");
        }
    }
});

function init() {
    console.log("Iniciando cliente do WhatsApp...");
    client.initialize();
}

module.exports = { init };

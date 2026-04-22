const escpos = require('escpos');
escpos.USB = require('escpos-usb');
escpos.Network = require('escpos-network');
require('dotenv').config();
const { sanitizePrinterText } = require('../utils/printer.utils');

function getPrinterHosts() {
    const hostsTxt = process.env.PRINTER_HOSTS || process.env.PRINTER_HOST || '127.0.0.1';
    return hostsTxt.split(',').map(h => h.trim()).filter(h => h.length > 0);
}

async function printInSingleDevice(host, port, orderId, orderDetails) {
    // Saneamento de acentos para evitar quebra em impressoras térmicas
    const sanitizedDetails = sanitizePrinterText(orderDetails);

    return new Promise((resolve) => {
        try {
            const device = new escpos.Network(host, port);
            const printer = new escpos.Printer(device);

            device.open(function (error) {
                if (error) {
                    console.error(`❌ [ERRO IMPRESSORA] ${host}:${port} está offline ou ocupada.`, error.message);
                    return resolve(false);
                }

                console.log(`🖨️  Enviando pedido #${orderId} para ${host}:${port}...`);
                
                printer
                    .font('a')
                    .align('ct')
                    .style('b')
                    .size(2, 2)
                    .text('CHURRASCARIA DO LEO')
                    .text('PEDIDO: #' + orderId)
                    .size(1, 1)
                    .text('--------------------------------')
                    .align('lt')
                    .text(sanitizedDetails) // Usando o texto limpo
                    .text('--------------------------------')
                    .align('ct')
                    .text(new Date().toLocaleString())
                    .cut()
                    .close(() => {
                        console.log(`✅ [SUCESSO] Impressão concluída em ${host}`);
                        resolve(true);
                    });
            });
        } catch (e) {
            console.error(`❌ [FALHA ADAPTER] Erro ao criar conexão com ${host}:`, e.message);
            resolve(false);
        }
    });
}

async function printOrder(orderId, orderDetails) {
    const type = process.env.PRINTER_TYPE || 'network';
    const port = parseInt(process.env.PRINTER_PORT) || 9100;

    if (type === 'usb') {
        // Legado USB (mantido para compatibilidade se necessário)
        return new Promise((resolve) => {
            try {
                const device = new escpos.USB();
                const printer = new escpos.Printer(device);
                device.open(() => {
                    printer.text(orderDetails).cut().close();
                    resolve(true);
                });
            } catch (e) { resolve(false); }
        });
    }

    const hosts = getPrinterHosts();
    console.log(`📢 [IMPRESSÃO] Disparando para ${hosts.length} impressoras configuradas...`);

    // Dispara para todas em paralelo (ou sequencial se preferir controle de logs melhor)
    const results = await Promise.all(
        hosts.map(host => printInSingleDevice(host, port, orderId, orderDetails))
    );

    const successCount = results.filter(r => r === true).length;
    
    if (successCount === 0) {
        console.log(`\n========= [MOCK VISUAL - TODAS OFFLINE] =========\n#COMANDA DO PEDIDO ${orderId}\n${orderDetails}\n================================================\n`);
    }

    return successCount > 0;
}

module.exports = { printOrder };


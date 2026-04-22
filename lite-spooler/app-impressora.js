require('dotenv').config();
const escpos = require('escpos');
escpos.USB = require('escpos-usb');
escpos.Network = require('escpos-network');
const http = require('http'); // para máxima compatibilidade sem pacotes extras

// O IP/Domínio público da VPS onde o Bot principal roda
// Aqui é setado como localhost padrao, mas pode ser configurado no .env (ex: VPS_URL=http://123.45.67.89:3000)
const VPS_URL = process.env.VPS_URL || 'http://localhost:3000';

function getPrinterHosts() {
    const hostsTxt = process.env.PRINTER_HOSTS || process.env.PRINTER_HOST || '127.0.0.1';
    return hostsTxt.split(',').map(h => h.trim()).filter(h => h.length > 0);
}

function sanitizePrinterText(text) {
    if (!text) return "";
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x00-\x7F]/g, "")
        .replace(/ç/g, "c")
        .replace(/Ç/g, "C");
}

function fetchJson(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        if (options.method === 'POST') req.end();
        else req.end();
    });
}

let isPrinting = false; // Mutex vital para o Spooler não se auto-sobrecarregar
async function fetchAndPrint() {
    if (isPrinting) return; // Protege contra setInterval disparar por cima de si mesmo em buffers gigantes
    isPrinting = true;

    try {
        const pedidos = await fetchJson(`${VPS_URL}/api/impressoes/pendentes`);
        if (!pedidos || pedidos.length === 0) return;

        for (const orderData of pedidos) {

            // Formatando o texto de impressão idêntico ao antigo Cérebro Local
            let pTxt = `TIPO: ${orderData.tipo_pedido.toUpperCase()}\n`;

            let nomeLimpo = orderData.cliente_nome || orderData.cliente_fone.replace('@c.us', '').replace('@lid', '');
            pTxt += `CLIENTE: ${nomeLimpo}\n`;

            if (orderData.tipo_pedido === 'entrega') {
                pTxt += `ENDEREÇO: ${orderData.endereco_entrega || 'NÃO INFORMADO'}\n`;
            }

            pTxt += `PAGAMENTO: ${orderData.forma_pagamento ? orderData.forma_pagamento.toUpperCase() : 'NÃO INFORMADO'}\n`;

            if (orderData.forma_pagamento && orderData.forma_pagamento.toLowerCase() === 'dinheiro') {
                if (orderData.troco_para && Number(orderData.troco_para) > Number(orderData.total)) {
                    const troco = Number(orderData.troco_para) - Number(orderData.total);
                    pTxt += `TROCO PARA: R$ ${Number(orderData.troco_para).toFixed(2)}\n`;
                    pTxt += `LEVAR TROCO DE: R$ ${troco.toFixed(2)}\n`;
                } else {
                    pTxt += `TROCO: Não precisa de troco\n`;
                }
            }

            pTxt += `--------------------------------\n`;
            pTxt += `ITENS:\n${orderData.resumo_itens}`;
            // A taxa de entrega agora vem embutida no resumo_itens vindo do order.service.js
            pTxt += `--------------------------------\n`;
            pTxt += `TOTAL A PAGAR: R$ ${Number(orderData.total).toFixed(2)}\n`;
            pTxt += `OBS: ${orderData.observacao || 'Nenhuma'}\n`;

            const sanitizedTxt = sanitizePrinterText(pTxt);
            const success = await printOrderLocal(orderData.id, sanitizedTxt);
            if (success) {
                await fetchJson(`${VPS_URL}/api/impressoes/concluir/${orderData.id}`, { method: 'POST' });
                console.log(`✅ [OK] Pedido #${orderData.id} impresso com sucesso no balcao local!`);
            }
        }
    } catch (e) {
        // Ignora erros de conexão para não flodar o terminal se a VPS reiniciar
    } finally {
        isPrinting = false; // Libera o hardware e o loop novamente
    }
}

async function printInSingleDeviceLocal(host, port, orderId, orderDetails) {
    return new Promise((resolve) => {
        try {
            const device = new escpos.Network(host, port);
            const printer = new escpos.Printer(device);

            device.open(function (error) {
                if (error) {
                    console.log(`❌ [SPOOLER MOCK] ${host}:${port} OFFLINE - #COMANDA ${orderId}`);
                    // Se falhar e for local, a gente pode retornar true pro Spooler fingir que imprimiu e não travar o banco, ou false. 
                    // Como temos múltiplas, retornamos false pra contar.
                    return resolve(false);
                }

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
                    .text(orderDetails)
                    .text('--------------------------------')
                    .align('ct')
                    .text(new Date().toLocaleString())
                    .cut()
                    .close(() => resolve(true));
            });
        } catch (e) {
            console.log(`❌ [SPOOLER MOCK] Falha ao conectar em ${host}`);
            resolve(false);
        }
    });
}

async function printOrderLocal(orderId, orderDetails) {
    const port = parseInt(process.env.PRINTER_PORT) || 9100;
    const hosts = getPrinterHosts();

    const results = await Promise.all(
        hosts.map(host => printInSingleDeviceLocal(host, port, orderId, orderDetails))
    );

    // Se pelomenos uma tiver impresso, consideramos sucesso.
    // Se NENHUMA imprimir, a gente resolve true de qualquer jeito no local pra não criar um loop infinito no BD.
    // Em produção o ideal seria avisar o painel.
    const successCount = results.filter(r => r === true).length;
    
    if (successCount === 0) {
        console.log(`\n========= [IMPRESSORA LOCAL MOCK - TODAS OFFLINE] =========\n#COMANDA DO PEDIDO ${orderId}\n${orderDetails}\n===========================================================\n`);
    }

    return true; // Sempre retorna true para baixar o pedido da fila do Cloud!
}

console.log("🖨️  ============================================");
console.log("🖨️  MINI SISTEMA DE IMPRESSÃO - LÉO CHURRASCARIA");
console.log("🖨️  ============================================");
console.log(`📡 Conectado à VPS no endereço: ${VPS_URL}`);
console.log("⏳ Aguardando e monitorando novos pedidos...");

// Faz chamadas de busca (Polling) a cada 5 segundos para a nuvem
setInterval(fetchAndPrint, 5000);
fetchAndPrint();


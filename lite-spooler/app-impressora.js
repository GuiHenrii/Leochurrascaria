const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
require('dotenv').config();

// CONFIGURAÇÃO
const VPS_URL = process.env.VPS_URL || 'http://34.39.252.241:3001';
const PRINTER_NAMES = process.env.PRINTER_NAMES || 'CHURRASQUEIRA,COZINHA';

function getPrinterNames() {
    return PRINTER_NAMES.split(',').map(n => n.trim()).filter(n => n.length > 0);
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
                    if (data) resolve(JSON.parse(data));
                    else resolve(null);
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

let isPrinting = false;
async function fetchAndPrint() {
    if (isPrinting) return;
    isPrinting = true;

    try {
        const pedidos = await fetchJson(`${VPS_URL}/api/impressoes/pendentes`);
        
        if (!pedidos) {
            console.log(`⚠️ [AVISO] Nao foi possivel ler os pedidos. Verifique se a VPS esta online em ${VPS_URL}`);
            return;
        }

        if (pedidos.length === 0) {
            // console.log("⏳ Sem pedidos pendentes...");
            return;
        }

        for (const orderData of pedidos) {
            console.log(`📦 Pedido #${orderData.id} encontrado! Processando...`);
            let pTxt = `TIPO: ${orderData.tipo_pedido.toUpperCase()}\n`;
            let nomeLimpo = orderData.cliente_nome || orderData.cliente_fone.replace('@c.us', '');
            pTxt += `CLIENTE: ${nomeLimpo}\n`;
            
            if (orderData.tipo_pedido === 'entrega') {
                pTxt += `ENDERECO: ${orderData.endereco_entrega || 'NAO INFORMADO'}\n`;
            }
            
            pTxt += `--------------------------------\n`;
            pTxt += `ITENS:\n${orderData.resumo_itens}\n`;
            pTxt += `--------------------------------\n`;
            pTxt += `OBS: ${orderData.observacao || 'Nenhuma'}\n`;

            const sanitizedTxt = sanitizePrinterText(pTxt);
            const success = await printViaWindows(orderData.id, sanitizedTxt);
            
            if (success) {
                await fetchJson(`${VPS_URL}/api/impressoes/concluir/${orderData.id}`, { method: 'POST' });
                console.log(`✅ [OK] Pedido #${orderData.id} impresso com sucesso!`);
            }
        }
    } catch (e) {
        console.error(`❌ Erro de Conexao com VPS (${VPS_URL}):`, e.message);
    } finally {
        isPrinting = false;
    }
}

async function printViaWindows(orderId, orderDetails) {
    return new Promise((resolve) => {
        const printerNames = getPrinterNames();
        const tempFile = path.join(__dirname, `pedido_${orderId}.txt`);
        
        // Adiciona comandos para aumentar a letra (Se a impressora suportar RAW)
        // E aumenta o espacamento lateral para preencher melhor o papel
        const header = "      CHURRASCARIA DO LEO\n";
        const footer = "\n\n\n\n\n"; 
        
        // Vamos usar o PowerShell para imprimir com uma fonte maior (Courier New, Size 12, Bold)
        // Isso funciona melhor do que tentar mandar comandos RAW via Out-Printer
        fs.writeFileSync(tempFile, header + orderDetails + footer, 'utf16le'); // UTF16LE funciona melhor com o Out-Printer do PS

        let completed = 0;
        printerNames.forEach(name => {
            console.log(`📡 [WINDOWS PRINT] Enviando Pedido #${orderId} (LETRA GRANDE) para: ${name}`);
            
            // Usando um script mais robusto do PowerShell para forçar o tamanho da fonte
            const psScript = `
                Add-Type -AssemblyName System.Drawing;
                $font = New-Object System.Drawing.Font('Courier New', 14, [System.Drawing.FontStyle]::Bold);
                $text = Get-Content -Path '${tempFile}' -Raw;
                $printDoc = New-Object System.Drawing.Printing.PrintDocument;
                $printDoc.PrinterSettings.PrinterName = '${name}';
                $printDoc.add_PrintPage({
                    param($sender, $e)
                    $e.Graphics.DrawString($text, $font, [System.Drawing.Brushes]::Black, 10, 10);
                });
                $printDoc.Print();
            `;

            const cmd = `powershell -Command "${psScript.replace(/\n/g, ' ')}"`;
            
            exec(cmd, (error) => {
                completed++;
                if (error) console.error(`❌ Erro em ${name}:`, error.message);
                else console.log(`✅ Sucesso em ${name}`);
                
                if (completed === printerNames.length) {
                    setTimeout(() => { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); }, 5000);
                    resolve(true);
                }
            });
        });
    });
}

console.log("🖨️  ============================================");
console.log("🖨️  SISTEMA DE IMPRESSÃO (MODO WINDOWS) - LÉO");
console.log("🖨️  ============================================");
console.log(`📡 Monitorando VPS: ${VPS_URL}`);
console.log(`🖨️  Impressoras Alvo: ${PRINTER_NAMES}`);

setInterval(fetchAndPrint, 5000);
fetchAndPrint();

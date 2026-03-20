# 🚀 PROJETO LÉO CHURRASCARIA - PARTE 5

## 📄 Arquivo: src\services\ai.service.js (Parte 2)
```js
                    };
                }

                if (action === 'finalizar_pedido') {
                    // GUARDRAIL: Verifica se o resumo financeiro já foi gerado nesta sessão
                    const jaTeveResumo = sessions[phone].some(m => m.role === 'tool' && m.content.includes('*RESUMO DO PEDIDO*'));

                    if (!jaTeveResumo) {
                        console.log(`[Guardrail] Bloqueando finalizar_pedido para <${phone}>: Resumo financeiro ausente.`);
                        sessions[phone].push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: "AVISO DO SISTEMA: Você não pode finalizar sem antes saber os preços reais. Chame AGORA a tool 'obter_resumo_financeiro' para descobrir o total e as taxas, mostre ao cliente e só depois peça permissão para fechar."
                        });
                        continue; // Força a IA a reconsiderar
                    }

                    args.tempo_fechamento_segundos = Math.round((Date.now() - sessions[phone].startTime) / 1000);
                    delete sessions[phone];
                    return {
                        isOrderCompleted: true,
                        orderData: args,
                        replyText: "Pedido recebido e confirmado! 🥩🔥 A comanda já está na cozinha."
                    };
                }
            }

             // Se for uma resposta de texto, verifica se precisa anexar o resumo financeiro oficial
             let finalReply = message.content;
             if (finalReply && !message.tool_calls) {
                 const lowText = text.toLowerCase();
                 const isPositive = !lowText.includes('não') && !lowText.includes('cancel') && !lowText.includes('nada');
                 
                 // Busca o resumo mais recente na sessão
                 const ultimoResumo = [...sessions[phone]].reverse().find(m => m.role === 'tool' && m.content.includes('*RESUMO DO PEDIDO*'));
                 
                 // SÓ anexa se o usuário NÃO estiver negando e se o resumo não estiver NA CARA DO GOL (últimas 2 msgs)
                 const jaMostrouRecentemente = sessions[phone].slice(-4).some(m => m.content && m.content.includes('*RESUMO DO PEDIDO*'));

                 if (ultimoResumo && !finalReply.includes('*RESUMO DO PEDIDO*') && isPositive && !jaMostrouRecentemente) {
                     console.log(`[Auto-Append] Forçando resumo oficial no texto para <${phone}>.`);
                     // Limpa possíveis resumos manuais toscos da IA e anexa o oficial
                     if (finalReply.includes('Total') || finalReply.includes('R$')) {
                         const pergs = finalReply.match(/[^.!?]+\?/g) || [];
                         finalReply = (pergs.length > 0 ? pergs[pergs.length - 1] : "Como gostaria de pagar?");
                     }
                     finalReply = ultimoResumo.content + "\n\n" + finalReply;
                 }
             }

            return { 
                isOrderCompleted: false, 
                replyText: finalReply || "Certo! Como posso ajudar agora?" 
            };

        } catch (error) {
            console.error("Groq API Error:", error.message || error);
            return {
                isOrderCompleted: false,
                replyText: "Tive um probleminha técnico aqui, mas já estou resolvendo! Pode repetir sua última mensagem? 🙏"
            };
        }
    }

    // Retorno de segurança caso o loop de 3 tentativas acabe sem resposta de texto
    const resumoFinal = [...sessions[phone]].reverse().find(m => m.role === 'tool' && m.content.includes('*RESUMO DO PEDIDO*'));
    let textoSeguranca = "Estou processando seu pedido! Pode me confirmar se está tudo certo?";
    
    if (resumoFinal) {
        textoSeguranca = resumoFinal.content + "\n\n" + "Pode confirmar se o resumo acima está correto para fecharmos?";
    }

    return {
        isOrderCompleted: false,
        replyText: textoSeguranca
    };
}

async function handleObterResumo({ itens, tipo_pedido }) {
    try {
        const ids = itens.map(i => i.produto_id);
        const [dbItens] = await db.pool.query('SELECT id, nome, preco, disponivel FROM produtos WHERE id IN (?)', [ids]);

        let subtotal = 0;
        let linhas = "";

        for (const item of itens) {
            const dbItem = dbItens.find(d => d.id === item.produto_id);
            if (dbItem) {
                if (dbItem.disponivel === 0) {
                    return `🔴 ERRO: O item "${dbItem.nome}" acabou de ESGOTAR. Por favor, avise o cliente e peça para ele escolher outra opção. Não complete o resumo com este item.`;
                }
                const v = Number(dbItem.preco) * item.quantidade;
                subtotal += v;
                linhas += `• ${item.quantidade}x ${dbItem.nome} = R$ ${v.toFixed(2)}\n`;
            }
        }

        const taxa = tipo_pedido === 'entrega' ? 10 : 0;
        const total = subtotal + taxa;

        // Persiste na sacola da sessão para a IA não esquecer nas próximas msgs
        const sessao = Object.values(sessions).find(s => s.phone === undefined); // fallback se necessário
        // Mas o ideal é passar o phone para o handle. Vamos assumir que a IA mantém o contexto.
        
        let resumo = `📄 *RESUMO DO PEDIDO*\n\n${linhas}`;
        if (taxa > 0) resumo += `🛵 Taxa de Entrega: R$ ${taxa.toFixed(2)}\n`;
        resumo += `\n💰 *TOTAL: R$ ${total.toFixed(2)}*`;

        return { resumo, dbItensSinc: dbItens.map(d => ({id: d.id, nome: d.nome, preco: d.preco})) };
    } catch (e) {
        return "Erro ao calcular valores. Por favor, verifique os nomes dos itens.";
    }
}

// ============================================================
// ÁUDIO E IMAGEM
// ============================================================
const fs = require('fs');
const path = require('path');
const os = require('os');

async function transcribeAudio(base64Data) {
    try {
        const tempPath = path.join(os.tmpdir(), `audio_${Date.now()}.ogg`);
        fs.writeFileSync(tempPath, Buffer.from(base64Data, 'base64'));
        const response = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempPath),
            model: "whisper-large-v3",
            language: "pt"
        });
        fs.unlinkSync(tempPath);
        return response.text;
    } catch (e) {
        console.error("Erro na transcrição Whisper:", e.message);
        return "[Áudio incompreensível]";
    }
}

async function describeImage(base64Data, mimetype) {
    try {
        const response = await openai.chat.completions.create({
            model: "llama-3.2-90b-vision-preview",
            messages: [{
                role: "user", content: [
                    { type: "text", text: "Descreva objetivamente o que esta imagem mostra no contexto de um pedido de churrascaria." },
                    { type: "image_url", image_url: { url: `data:${mimetype};base64,${base64Data}` } }
                ]
            }],
            max_tokens: 200,
        });
        return `[Imagem recebida: ${response.choices[0].message.content}]`;
    } catch (e) {
        console.error("Erro na Llama Vision:", e.message);
        return "[Imagem recebida, mas não foi possível lê-la]";
    }
}

function hasActiveSession(phone) {
    return !!(sessions[phone] && sessions[phone].length > 1);
}

function initSession(phone) {
    if (!sessions[phone]) {
        sessions[phone] = [{ role: "system", content: SYSTEM_PROMPT }];
        sessions[phone].startTime = Date.now();
        sessions[phone].menuInjetado = false;
        console.log(`[Session] Inicializada manualmente para <${phone}>.`);
    }
}

module.exports = { processMessage, transcribeAudio, describeImage, hasActiveSession, initSession };


```

---

## 📄 Arquivo: src\services\order.service.js
```js
const db = require('../config/db');
const { printOrder } = require('./printer.service');

async function processNewOrder(phone, orderData) {
    try {
        // 1. Achar ou criar cliente
        const [clientes] = await db.pool.query('SELECT id FROM clientes WHERE telefone = ?', [phone]);
        let clienteId;
        if (clientes.length === 0) {
            const [result] = await db.pool.query('INSERT INTO clientes (telefone) VALUES (?)', [phone]);
            clienteId = result.insertId;
        } else {
            clienteId = clientes[0].id;
        }

        // 2. Criar pedido
        const obs = orderData.observacao || '';
        const tp = orderData.tipo_pedido || 'entrega';
        const ender = orderData.endereco_entrega || '';
        const pag = orderData.forma_pagamento || '';
        
        const [pedidoRes] = await db.pool.query(
            'INSERT INTO pedidos (cliente_id, observacao, tipo_pedido, endereco_entrega, forma_pagamento) VALUES (?, ?, ?, ?, ?)', 
            [clienteId, obs, tp, ender, pag]
        );
        const pedidoId = pedidoRes.insertId;

        // 3. Adicionar itens e calcular total
        let subtotalProdutos = 0;
        let pTxtItens = "";

        for (const item of orderData.itens) {
            const [produtos] = await db.pool.query('SELECT nome, preco FROM produtos WHERE id = ?', [item.produto_id]);
            if (produtos.length > 0) {
                const p = produtos[0];
                const sub = p.preco * item.quantidade;
                subtotalProdutos += sub;
                await db.pool.query('INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)', [pedidoId, item.produto_id, item.quantidade, p.preco]);
                pTxtItens += `${item.quantidade}x ${p.nome} = R$ ${sub.toFixed(2)}\n`;
            }
        }

        const taxaEntrega = orderData.tipo_pedido === 'entrega' ? 10.00 : 0;
        const totalGeral = subtotalProdutos + taxaEntrega;

        // 4. Montar Comanda Final
        let pTxt = `\n======= COMANDA =======\n`;
        pTxt += `TIPO: ${orderData.tipo_pedido ? orderData.tipo_pedido.toUpperCase() : 'NÃO INFORMADO'}\n`;
        
        if (orderData.tipo_pedido === 'entrega') {
            pTxt += `ENDEREÇO: ${orderData.endereco_entrega}\n`;
        }

        pTxt += `PAGAMENTO: ${orderData.forma_pagamento ? orderData.forma_pagamento.toUpperCase() : 'NÃO INFORMADO'}\n`;

        if (orderData.troco_para && orderData.troco_para > totalGeral) {
            const troco = orderData.troco_para - totalGeral;
            pTxt += `TROCO PARA: R$ ${Number(orderData.troco_para).toFixed(2)}\n`;
            pTxt += `LEVAR TROCO DE: R$ ${troco.toFixed(2)}\n`;
        }

        pTxt += `--------------------------------\n`;
        pTxt += `ITENS:\n${pTxtItens}`;
        if (taxaEntrega > 0) pTxt += `\nTaxa de Entrega: R$ 10.00\n`;
        pTxt += `--------------------------------\n`;
        pTxt += `TOTAL A PAGAR: R$ ${totalGeral.toFixed(2)}\n`;
        pTxt += `OBS: ${obs}\n`;

        // Atribui total e tempo no DB CRM
        await db.pool.query('UPDATE pedidos SET total = ?, tempo_fechamento_segundos = ? WHERE id = ?', [totalGeral, orderData.tempo_fechamento_segundos || 0, pedidoId]);

        // 4. Imprimir
        await printOrder(pedidoId, pTxt);

        return true;
    } catch (e) {
        console.error("Erro salvando pedido (mysql down?):", e.message);
        // Fallback for mock environment missing db
        await printOrder('MOCK', JSON.stringify(orderData, null, 2));
        return true;
    }
}

module.exports = { processNewOrder };

```

---

## 📄 Arquivo: src\services\printer.service.js
```js
const escpos = require('escpos');
escpos.USB = require('escpos-usb');
escpos.Network = require('escpos-network');
require('dotenv').config();

function getPrinterDevice() {
    try {
        const type = process.env.PRINTER_TYPE || 'network';
        if (type === 'usb') {
            return new escpos.USB();
        } else {
            return new escpos.Network(process.env.PRINTER_HOST || '127.0.0.1', process.env.PRINTER_PORT || 9100);
        }
    } catch (e) {
        return null; // Mock printer se der erro no adapter ou porta
    }
}

async function printOrder(orderId, orderDetails) {
    return new Promise((resolve) => {
        const device = getPrinterDevice();
        if (!device) {
            console.log(`\n========= [PRINTER MOCK] =========\n#COMANDA DO PEDIDO ${orderId}\n${orderDetails}\n==================================\n`);
            return resolve(true);
        }

        try {
            const printer = new escpos.Printer(device);
            device.open(function (error) {
                if (error) {
                    // Fallback to screen mock if offline
                    console.log(`\n========= [PRINTER MOCK - OFFLINE] =========\n#COMANDA DO PEDIDO ${orderId}\n${orderDetails}\n============================================\n`);
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
                    .close();
                
                resolve(true);
            });
        } catch(e) {
            console.log(`\n========= [PRINTER MOCK - FALLBACK] =========\n#COMANDA DO PEDIDO ${orderId}\n${orderDetails}\n=============================================\n`);
            resolve(false);
        }
    });
}

module.exports = { printOrder };

```

---


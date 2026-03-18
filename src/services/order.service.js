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
        const [pedidoRes] = await db.pool.query('INSERT INTO pedidos (cliente_id, observacao) VALUES (?, ?)', [clienteId, obs]);
        const pedidoId = pedidoRes.insertId;

        // 3. Adicionar itens e calcular logistica
        let total = 0;
        let isEntrega = orderData.tipo_pedido === 'entrega';
        
        let pTxt = `\n======= COMANDA =======\n`;
        pTxt += `TIPO: ${orderData.tipo_pedido ? orderData.tipo_pedido.toUpperCase() : 'NÃO INFORMADO'}\n`;
        if (isEntrega) {
            pTxt += `ENDEREÇO DE ENTREGA: \n${orderData.endereco_entrega}\n`;
            pTxt += `PAGAMENTO: ${orderData.forma_pagamento || 'Não informado'}\n`;
        } else {
            pTxt += `PAGAMENTO NO LOCAL: ${orderData.forma_pagamento || 'Não informado'}\n`;
        }
        pTxt += `--------------------------------\n`;
        pTxt += `ITENS:\n`;

        for (const item of orderData.itens) {
            const [produtos] = await db.pool.query('SELECT nome, preco FROM produtos WHERE id = ?', [item.produto_id]);
            if (produtos.length > 0) {
                const p = produtos[0];
                const subtotal = p.preco * item.quantidade;
                total += subtotal;

                await db.pool.query('INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)', [pedidoId, item.produto_id, item.quantidade, p.preco]);

                pTxt += `${item.quantidade}x ${p.nome} = R$ ${subtotal.toFixed(2)}\n`;
            }
        }

        if (isEntrega) {
            pTxt += `\nTaxa de Entrega: R$ 10.00\n`;
            total += 10.00;
        }

        pTxt += `--------------------------------\n`;
        pTxt += `TOTAL A PAGAR: R$ ${total.toFixed(2)}\n`;
        pTxt += `OBS: ${obs}\n`;

        // Atribui total e tempo no DB CRM
        await db.pool.query('UPDATE pedidos SET total = ?, tempo_fechamento_segundos = ? WHERE id = ?', [total, orderData.tempo_fechamento_segundos || 0, pedidoId]);

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

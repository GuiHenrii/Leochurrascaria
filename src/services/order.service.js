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
            const [produtos] = await db.pool.query(`
                SELECT p.nome, p.preco, c.nome as categoria 
                FROM produtos p
                JOIN categorias c ON p.categoria_id = c.id
                WHERE p.id = ?
            `, [item.produto_id]);
            
            if (produtos.length > 0) {
                const p = produtos[0];
                const sub = p.preco * item.quantidade;
                subtotalProdutos += sub;
                await db.pool.query('INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)', [pedidoId, item.produto_id, item.quantidade, p.preco]);
                pTxtItens += `${item.quantidade}x ${p.nome} (${p.categoria}) = R$ ${sub.toFixed(2)}\n`;
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

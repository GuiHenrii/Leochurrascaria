require('dotenv').config();
const db = require('./src/config/db');

async function injectExtremeOrders() {
    console.log("🔥 INJETANDO 5 PEDIDOS EXTREMOS E CONCORRENTES NO BANCO DE DADOS DA VPS...");
    
    const baseOrder = {
        cliente_id: 1, // Assume we have a client 1
        cliente_fone: '5511999999999',
        status: 'confirmado',
        impresso: 0,
        tempo_fechamento_segundos: 120
    };

    const pedidos = [
        {
            ...baseOrder,
            resumo_itens: "10x Espetão 1kg (Picanha) = R$ 1890.00\n5x Coca-Cola 2L = R$ 75.00\n",
            total: 1965.00,
            tipo_pedido: 'entrega',
            endereco_entrega: 'Rua do Teste Extremo, 999 - Bairro Caos. Apto 404 Bloco Z',
            forma_pagamento: 'dinheiro',
            troco_para: 2000.00,
            observacao: 'ATENÇÃO: Cliente muito exigente, carne mal passada. Sem cebola na vinagrete. Entregar rápido!'
        },
        {
            ...baseOrder,
            resumo_itens: "1x Jantinha Simples = R$ 25.00\n1x Guaraná Lata = R$ 8.00\n",
            total: 33.00,
            tipo_pedido: 'mesa',
            numero_mesa: 'Mesa 12',
            forma_pagamento: 'pix',
            observacao: 'Mesa do canto perto da janela.'
        },
        {
            ...baseOrder,
            resumo_itens: "50x Bolinha de Queijo = R$ 1500.00\n",
            total: 1500.00,
            tipo_pedido: 'retirada',
            forma_pagamento: 'cartao',
            observacao: 'Festa de aniversário, buzinar quando chegar na porta.'
        },
        {
            ...baseOrder,
            resumo_itens: "2x Isca de Peixe 500g = R$ 140.00\n",
            total: 140.00,
            tipo_pedido: 'entrega',
            endereco_entrega: 'Av. Brasil, S/N',
            forma_pagamento: 'pix',
            observacao: 'Deixar na portaria.'
        },
        {
            ...baseOrder,
            resumo_itens: "1x Água Tônica = R$ 8.00\n1x Cerveja Original = R$ 13.00\n",
            total: 21.00,
            tipo_pedido: 'mesa',
            numero_mesa: 'Mesa 01',
            forma_pagamento: 'dinheiro',
            troco_para: 50.00,
            observacao: 'Trazer copo com muito gelo e limão extra. Urgente.'
        }
    ];

    try {
        // Garantir que o cliente 1 existe
        await db.pool.query('INSERT IGNORE INTO clientes (id, telefone, nome) VALUES (1, "5511999999999", "Cliente Teste Extremo")');

        for (const p of pedidos) {
            await db.pool.query(
                `INSERT INTO pedidos (cliente_id, cliente_fone, resumo_itens, tipo_pedido, endereco_entrega, forma_pagamento, numero_mesa, status, total, observacao, troco_para, impresso) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    p.cliente_id, p.cliente_fone, p.resumo_itens, p.tipo_pedido, 
                    p.endereco_entrega || null, p.forma_pagamento, p.numero_mesa || null, 
                    p.status, p.total, p.observacao || null, p.troco_para || null, p.impresso
                ]
            );
        }
        console.log("✅ 5 Pedidos Extremos Inseridos com Sucesso na Fila da VPS!");
    } catch (e) {
        console.error("Erro ao injetar pedidos:", e);
    } finally {
        process.exit(0);
    }
}

injectExtremeOrders();

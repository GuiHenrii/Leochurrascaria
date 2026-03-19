const { OpenAI } = require('openai');
const db = require('../config/db');
require('dotenv').config();

const openai = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
});

// ============================================================
// CACHE GLOBAL (persistente em memória enquanto o Node roda)
// Nunca vai ao BD duas vezes pela mesma categoria
// ============================================================
const menuCache = {
    categorias: null,          // { id, nome }[]
    itensPorCategoria: {},     // { "Espetinho Simples": "formatado" }
    textoCategorias: null      // String pronta para exibição
};

async function carregarCategorias() {
    if (menuCache.categorias) return; // Já em cache
    const [rows] = await db.pool.query('SELECT id, nome FROM categorias ORDER BY id');
    menuCache.categorias = rows;

    // Texto de exibição das categorias (montado uma única vez)
    let txt = '🍢 *Cardápio Léo Churrascaria* 🍢\n\nDigite o *número* da categoria que deseja ver:\n\n';
    rows.forEach((c, i) => {
        txt += `*${i + 1}* - ${c.nome}\n`;
    });
    txt += '\nOu já me diz direto o que vai querer! 😄';
    menuCache.textoCategorias = txt;
}

async function getItensDaCategoria(categoriaId, categoriaNome) {
    if (menuCache.itensPorCategoria[categoriaNome]) {
        return menuCache.itensPorCategoria[categoriaNome];
    }
    const [produtos] = await db.pool.query(
        'SELECT id, nome, preco, descricao FROM produtos WHERE categoria_id = ? AND disponivel = 1',
        [categoriaId]
    );
    let txt = `🍢 *${categoriaNome}*\n\n`;
    produtos.forEach(p => {
        const preco = p.preco > 0 ? `R$ ${Number(p.preco).toFixed(2)}` : 'CONSULTAR';
        txt += `• ${p.nome} — *${preco}*\n${p.descricao ? p.descricao + '\n' : ''}`;
    });
    txt += '\n_Para pedir, é só me dizer o que anotei aqui!_';
    menuCache.itensPorCategoria[categoriaNome] = txt;
    return txt;
}

async function getAllItensParaIA() {
    const [rows] = await db.pool.query('SELECT p.id, p.nome, p.preco, p.disponivel, p.descricao, c.nome as categoria FROM produtos p JOIN categorias c ON p.categoria_id = c.id ORDER BY c.id, p.nome');
    return rows.map(r => `• ${r.nome} — *R$ ${Number(r.preco).toFixed(2)}*\n${r.descricao ? r.descricao : ''}${r.disponivel ? '' : ' [ESGOTADO]'}`).join('\n');
}

async function getAvisoEstoque() {
    const [rows] = await db.pool.query('SELECT nome FROM produtos WHERE disponivel = 0');
    if (rows.length === 0) return "";
    return `\n[SISTEMA-ESTOQUE] ATENÇÃO: Os seguintes itens estão ESGOTADOS no momento e NÃO devem ser oferecidos: ${rows.map(r => r.nome).join(', ')}.`;
}

// ============================================================
// PROMPT mínimo - sem menu embutido
// ============================================================
const SYSTEM_PROMPT = `Você é o "Léo", atendente da Léo Churrascaria. Fale como um garçom jovem, simpático e descontraído — nunca como um robô ou SAC corporativo.

REGRAS DE CONVERSA:
- Fale curto. Uma ideia por mensagem.
- Faça UMA pergunta por vez. Nunca misture perguntas.
- Varie as respostas. Não comece toda frase com "Entendido!" ou "Certo!".
- Seja natural, como se estivesse mandando mensagem de verdade.

FLUXO DE PEDIDO — siga EXATAMENTE nesta sequência, UMA etapa por vez:

ETAPA 1 — COLETAR ITENS
Anote tudo que o cliente pedir. Continue coletando até ele indicar que terminou (ex: "é só isso", "pode ser", "só isso mesmo", "mais nada"). Não confirme o pedido antes do cliente terminar.

ETAPA 2 — PERGUNTAR ENTREGA/RETIRADA/MESA
Depois que o cliente terminar de pedir, faça APENAS esta pergunta: vai ser pra mesa, retirada ou entrega?
Aguarde a resposta. Não pergunte mais nada junto.

ETAPA 3 — ENDEREÇO OU LOCAL
Se for entrega: peça o endereço completo ou a localização GPS. Se ele enviar a localização, você receberá a Rua/Bairro. Como o GPS às vezes é incompleto, você DEVE perguntar: "Consegue me passar o número da casa, quadra ou lote para o entregador não se perder?"
Se for retirada ou mesa: prossiga para a Etapa 4.

ETAPA 4 — CÁLCULO E EXIBIÇÃO DE VALORES (OBRIGATÓRIO)
Assim que tiver o endereço (ou se for mesa/retirada), você DEVE chamar a tool 'obter_resumo_financeiro'.
Você NÃO sabe os preços nem as taxas. O sistema te dará o resumo.
Mostre o resumo EXATAMENTE como a tool devolver e faça a seguinte pergunta:
"Como você gostaria de pagar? (Dinheiro, Cartão ou Pix?)"

ETAPA 5 — PAGAMENTO E TROCO
Se o cliente escolher DINHEIRO, pergunte: "Precisa de troco para quanto?"
Se escolher Pix ou Cartão, prossiga para a Etapa 6.

ETAPA 6 — FINALIZAR
Confirme os detalhes finais (incluindo o troco se houver) e chame a tool 'finalizar_pedido'.

RESOLUÇÃO DE AMBIGUIDADE (PRIORIDADE MÁXIMA — LEIA COM ATENÇÃO):
Os seguintes itens existem em VÁRIAS categorias com preços COMPLETAMENTE DIFERENTES:
- "Contra Filé" → Espetão 500g (R$85), Espetão 1kg (R$159), Espetinho Simples (R$14), Espetinho Especial (R$19), Jantinha (R$26)
- "Franbacon" → Espetinho Simples (R$12), Espetinho Especial (R$17), Jantinha (R$25)
- "Queijo Coalho" → Espetinho Simples (R$14), Espetinho Especial (R$20), Jantinha (R$27)
- "Heineken" → Cervejas Lata (R$17), Long Neck (R$12)
- "Picanha" → Espetão 500g (R$99), Espetão 1kg (R$189)
- Muitos outros itens também se repetem!

Quando o cliente pedir QUALQUER item que exista em mais de uma categoria, você é OBRIGADO a perguntar qual tipo ele quer ANTES de anotar. Exemplos:
- "Quero um contra filé" → "Contra filé tem em espetinho simples (R$14), espetinho especial (R$19), jantinha (R$26) e espetão. Qual você prefere?"
- "Me dá um franbacon" → "Franbacon tem em espetinho simples, espetinho especial e jantinha. Qual vai ser?"
- ESTILO DE LISTA: Use SEMPRE listas verticais com bullet points (•) e preços. O cliente EXIGE ver os acompanhamentos repetidos em cada linha conforme o mapa de IDs.
- DEDUPLICAÇÃO DE MENU (CRÍTICO): Se você já enviou a lista de uma categoria (ex: Jantinha) nos últimos 2 turnos, NÃO envie a lista completa novamente se o cliente apenas citar o nome da categoria para confirmar um item. Apenas responda: "Beleza, Jantinha! Qual sabor você prefere?".
- SÓ envie a lista completa se o cliente perguntar "o que tem?", "qual o cardápio?" ou "quais os sabores?".
- JAMAIS assuma o mais barato ou mais caro por conta própria. SEMPRE pergunte.

REGRA DE OURO (NÃO REPETIR):
- Após chamar 'obter_resumo_financeiro', você JAMAIS deve listar os itens novamente ou repetir preços e totais.
6. IMPORTANTE: Antes de oferecer qualquer item, consulte o mapa de IDs enviado pelo sistema. Se um item estiver marcado como indisponível ou se a ferramenta de resumo retornar erro de estoque, informe educadamente que o item acabou e sugira uma alternativa parecida.
7. Quando o pedido estiver completo e o endereço definido, APRESENTE O RESUMO e pergunte a forma de pagamento (Dinheiro, Cartão ou Pix).
8. SEJA CONCISO. Evite textos gigantes. Use negrito para valores e nomes de pratos.

PROIBIÇÕES CRÍTICAS:
- JAMAIS pergunte o pagamento antes de mostrar o resumo financeiro com o TOTAL.
- PROIBIÇÃO SEVERA: Você NÃO tem autorização para dar descontos, cortesias ou negociar preços. Os valores são fixos conforme o cardápio.
- AMBIGUIDADE: Se o cliente pedir algo genérico (ex: "Contra filé") e o mapa de IDs mostrar várias opções (ex: Jantinha, Espeto, Espetão), você DEVE listar todas as opções de "Contra filé" com seus preços e perguntar qual ele prefere antes de calcular o resumo.
- CANCELAMENTO: Se o cliente pedir para cancelar ou limpar tudo, use a ferramenta 'cancelar_pedido' imediatamente.
- DEDUPLICAÇÃO: Não repita o resumo financeiro se você acabou de mostrá-lo na mensagem anterior.
- JAMAIS finalize um pedido sem antes ter exibido o resumo financeiro oficial.
- JAMAIS invente preços. Use apenas o que a tool 'obter_resumo_financeiro' te der.`;

const sessions = {};

// ============================================================
// PROCESSADOR DE MENSAGEM
// ============================================================
async function processMessage(phone, text) {
    // Garante que as categorias estão em cache
    await carregarCategorias();

    // ---- INTERCEPÇÃO DE MENU (ZERO tokens de IA) ----
    const textLower = text.trim().toLowerCase();

    // Detecta pedido de cardápio/menu
    const pedindoMenu = /(card[aá]pio|cardapio|menu|o que tem|o que voc[eê]s t[eê]m|ver op[cç][oõ]es|op[cç][oõ]es|o que pedido|listar)/i.test(text);

    if (pedindoMenu) {
        return { isOrderCompleted: false, replyText: menuCache.textoCategorias };
    }

    // Detecta seleção de categoria por número (ex: "1", "2", "3"...)
    const numMatch = textLower.match(/^(\d{1,2})$/);
    if (numMatch) {
        const idx = parseInt(numMatch[1]) - 1;
        if (menuCache.categorias && idx >= 0 && idx < menuCache.categorias.length) {
            const cat = menuCache.categorias[idx];
            const itens = await getItensDaCategoria(cat.id, cat.nome);
            return { isOrderCompleted: false, replyText: itens };
        }
    }

    // Detecta seleção de categoria por nome (DESATIVADO: Deixando a IA lidar com o fluxo para evitar repetição)
    /*
    if (menuCache.categorias) {
        for (const cat of menuCache.categorias) {
            const nomeSimples = cat.nome.toLowerCase().split('(')[0].trim();
            if (textLower.includes(nomeSimples) && textLower.length < 40) {
                const itens = await getItensDaCategoria(cat.id, cat.nome);
                return { isOrderCompleted: false, replyText: itens };
            }
        }
    }
    */

    // ---- FLUXO DE IA (apenas para pedidos reais e checkout) ----
    if (!sessions[phone]) {
        sessions[phone] = [{ role: "system", content: SYSTEM_PROMPT }];
        sessions[phone].startTime = Date.now();
        sessions[phone].menuInjetado = false;
    }

    // Injeta o mapa de IDs UMA única vez
    if (!sessions[phone].menuInjetado) {
        const menuIA = await getAllItensParaIA();
        sessions[phone].push({
            role: "user",
            content: "[SISTEMA-INTERNO] Mapa de IDs do cardápio (NUNCA exiba ao cliente):\n" + menuIA
        });
        sessions[phone].push({ role: "assistant", content: "[OK, mapa carregado internamente]" });
        sessions[phone].menuInjetado = true;
    }

    sessions[phone].push({ role: "user", content: text });

    // Contexto Dinâmico: Verifica estoque real EM CADA MENSAGEM
    const avisoEstoque = await getAvisoEstoque();
    let messagesToGen = [...sessions[phone]];

    // Poda: mantém system + menu + saudações + últimas 20 mensagens (janela ideal para evitar repetição)
    if (messagesToGen.length > 25) {
        messagesToGen = [
            sessions[phone][0], // System Prompt
            sessions[phone][1], // Mapa de IDs (Contexto Fixo)
            ...sessions[phone].slice(2, 4), // Primeiras mensagens (Saudação/Histórico)
            ...sessions[phone].slice(-20) // Janela deslizante de 20 mensagens
        ];
    }

    // Injeta aviso de estoque ATUALIZADO no final do contexto
    if (avisoEstoque) {
        messagesToGen.push({ role: "system", content: avisoEstoque });
    }

    // Loop de execução de ferramentas (até 3 tentativas)
    for (let i = 0; i < 3; i++) {
        try {
            // Verifica se já teve resumo (atualizado a cada iteração do loop)
            const jaTeveResumo = sessions[phone].some(m => m.role === 'tool' && m.content.includes('*RESUMO DO PEDIDO*'));

            // Detecta GPS para ocultar ferramentas temporariamente
            const ultimaMsgUser = [...sessions[phone]].reverse().find(m => m.role === 'user');
            const ehGPS = ultimaMsgUser && ultimaMsgUser.content && ultimaMsgUser.content.includes('[LOCALIZAÇÃO GPS]');

            const currentTools = [];

            // Só mostra a ferramenta de cálculo se NÃO for GPS (forçando IA a pedir complemento primeiro)
            if (!ehGPS) {
                currentTools.push({
                    type: "function",
                    function: {
                        name: "obter_resumo_financeiro",
                        description: "Calcula o total do pedido baseado nos itens e tipo de entrega.",
                        parameters: {
                            type: "object",
                            properties: {
                                itens: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            produto_id: { type: "integer", description: "O ID deve ser um NÚMERO INTEIRO (ex: 42). NÃO envie como string." },
                                            quantidade: { type: "integer" }
                                        },
                                        required: ["produto_id", "quantidade"]
                                    }
                                },
                                tipo_pedido: { type: "string", enum: ["entrega", "retirada", "mesa"] }
                            },
                            required: ["itens", "tipo_pedido"]
                        }
                    }
                });
            }

            // SÓ LIBERA 'finalizar_pedido' se o resumo já tiver sido gerado
            if (jaTeveResumo) {
                currentTools.push({
                    type: "function",
                    function: {
                        name: "finalizar_pedido",
                        description: "FECHAMENTO: Chame apenas após o cliente confirmar o resumo financeiro exibido.",
                        parameters: {
                            type: "object",
                            properties: {
                                itens: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            produto_id: { type: "integer", description: "ID numérico (ex: 42)" },
                                            quantidade: { type: "integer" }
                                        },
                                        required: ["produto_id", "quantidade"]
                                    }
                                },
                                tipo_pedido: { type: "string", enum: ["entrega", "retirada", "mesa"] },
                                endereco_entrega: { type: "string" },
                                forma_pagamento: { type: "string" },
                                troco_para: { type: ["integer", "null"], description: "Valor para troco. Use número inteiro." },
                                observacao: { type: "string" }
                            },
                            required: ["itens", "tipo_pedido", "forma_pagamento"]
                        }
                    }
                });
            }

            // Ferramenta de CANCELAMENTO (sempre disponível)
            currentTools.push({
                type: "function",
                function: {
                    name: "cancelar_pedido",
                    description: "Reseta a sessão e limpa o pedido atual. Chame se o cliente quiser cancelar tudo."
                }
            });

            // LÓGICA DE tool_choice DINÂMICA
            let toolChoice = "auto";
            const jaDefiniuLocal = sessions[phone].some(m =>
                m.role === 'user' && /(rua|quadra|lote|setor|bairro|casa|apartamento|mesa|retirada|retirar|aqui)/i.test(m.content || '')
            );

            if (jaDefiniuLocal && !jaTeveResumo && !ehGPS && currentTools.length > 0) {
                console.log(`[Forcing Tool] <${phone}>: Forçando obter_resumo_financeiro.`);
                toolChoice = { type: "function", function: { name: "obter_resumo_financeiro" } };
            }

            const response = await openai.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                max_tokens: 500,
                temperature: 0.1,
                messages: messagesToGen,
                tools: currentTools.length > 0 ? currentTools : undefined,
                tool_choice: currentTools.length > 0 ? toolChoice : undefined
            });

            const message = response.choices[0].message;
            sessions[phone].push(message);

            if (message.tool_calls && message.tool_calls.length > 0) {
                const toolCall = message.tool_calls[0];
                const action = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);

                // Forçar IDs e Quantidades como números inteiros (correção de bug da Groq/Áudio)
                if (args.itens) {
                    args.itens = args.itens.map(it => ({
                        ...it,
                        produto_id: Math.round(Number(it.produto_id)),
                        quantidade: Math.round(Number(it.quantidade)) || 1
                    }));
                }

                // Remove campos null (Evita erro 400 na Groq)
                Object.keys(args).forEach(k => { if (args[k] === null) delete args[k]; });

                if (action === 'obter_resumo_financeiro') {
                    const resumo = await handleObterResumo(args);
                    sessions[phone].push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: resumo
                    });
                    continue; // Volta para a IA processar o resumo e responder ao cliente
                }

                if (action === 'cancelar_pedido') {
                    delete sessions[phone];
                    return {
                        isOrderCompleted: false,
                        replyText: "Tudo bem, pedido cancelado! 🗑️ Se precisar de algo, só chamar."
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

        let resumo = `📄 *RESUMO DO PEDIDO*\n\n${linhas}`;
        if (taxa > 0) resumo += `🛵 Taxa de Entrega: R$ ${taxa.toFixed(2)}\n`;
        resumo += `\n💰 *TOTAL: R$ ${total.toFixed(2)}*`;

        return resumo;
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

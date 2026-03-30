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
    categorias: null,
    itensPorCategoria: {},
    textoCategorias: null
};

// FUNÇÃO PARA LIMPAR TUDO (Chamada por comando ou script)
function limparCachesSistema() {
    menuCache.categorias = null;
    menuCache.itensPorCategoria = {};
    menuCache.textoCategorias = null;
    Object.keys(sessions).forEach(key => delete sessions[key]);
    console.log("🧹 [SISTEMA] Cachés e Sessões limpos com sucesso!");
}

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
        if (p.id === 999) {
            txt += `*${p.nome}*\n_${p.descricao}_\n\n`;
            return;
        }
        const preco = p.preco > 0 ? `R$ ${Number(p.preco).toFixed(2)}` : 'R$ 0.00';
        txt += `• ${p.nome} — *${preco}*\n${p.descricao ? p.descricao + '\n' : ''}\n`;
    });
    txt += '\n_Para pedir, é só me dizer o que anotei aqui!_';
    menuCache.itensPorCategoria[categoriaNome] = txt;
    return txt;
}

async function getAllItensParaIA() {
    const [rows] = await db.pool.query('SELECT p.id, p.nome, p.preco, p.disponivel, p.descricao, c.nome as categoria FROM produtos p JOIN categorias c ON p.categoria_id = c.id ORDER BY c.id, p.nome');

    let currentCat = "";
    let menuTxt = "CARDÁPIO OFICIAL (Mapeamento de IDs):\n";

    rows.forEach(r => {
        if (r.categoria !== currentCat) {
            currentCat = r.categoria;
            menuTxt += `\n[CATEGORIA: ${currentCat}]\n`;
        }
        let desc = r.descricao ? ` (Descrição/Sabores: ${r.descricao})` : "";
        menuTxt += `ID:${r.id} | [${currentCat}] ${r.nome} | Preço: R$${Number(r.preco).toFixed(2)}${r.disponivel ? '' : ' [ESGOTADO]'}${desc}\n`;
    });

    return menuTxt;
}

async function getAvisoEstoque() {
    const [rows] = await db.pool.query('SELECT nome FROM produtos WHERE disponivel = 0');
    if (rows.length === 0) return "";
    return `\n[SISTEMA-ESTOQUE] ATENÇÃO: Os seguintes itens estão ESGOTADOS no momento e NÃO devem ser oferecidos: ${rows.map(r => r.nome).join(', ')}.`;
}

// ============================================================
// PROMPT mínimo - sem menu embutido
// ============================================================
const SYSTEM_PROMPT = `Você é o "Léo", atendente da Léo Churrascaria. Fale como um garçom jovem, simpático e descontraído — nunca como um robô ou sistema corporativo.

REGRAS DE CONVERSA:
- Fale curto. Uma ideia por mensagem.
- Faça UMA pergunta por vez. Nunca misture perguntas.
- Varie as respostas. Não comece toda frase com "Entendido!" ou "Certo!".
- Seja natural, como se estivesse mandando mensagem de verdade.
- 🚨 PROIBIÇÃO ABSOLUTA: NUNCA mencione a palavra "ID", "Sistema" ou fale os números de ID gerados para o cliente (ex: "O item X tem o ID 42"). Os IDs são ESTRITAMENTE SECRETOS para você usar nas Tools invisíveis. Se for dar opção de suco, seja humano: "Você prefere o Suco de Laranja no copo (R$9) ou na Jarra (R$17)?"

DÚVIDAS FREQUENTES (BASE DE CONHECIMENTO DO LÉO):
1. Tempo de entrega: O nosso tempo médio de entrega (preparo + motoboy) é de até 30 a 40 minutos. Em dias de pico pode sofrer pequena alteração, mas chega rápido!
2. "Já saiu para entrega?" ou "Cadê meu pedido?" no Suporte (Pós-Venda): Significa que o pedido já foi recebido e emitido para a cozinha. TRANQUILIZE O CLIENTE avisando que "O seu pedido já está em andamento. Geralmente leva 30 minutos, o motoboy já deve estar a caminho ou os meninos da cozinha estão finalizando o embrulho!" (JAMAIS diga que a entrega acabou ou foi 'finalizada' no sentido de concluída).
3. Localização/Endereço: Ficamos na Av. Bandeirantes, Centro. (Se pedirem a localização no GPS, não envie link, eu o sistema farei isso pra você).
4. Horário de Funcionamento: Atendemos de Segunda a Sábado, das 18h às 23:45. Não abrimos no almoço.
5. Formas de Pagamento: Aceitamos PIX, Cartões de Crédito/Débito (Levamos a maquininha) e Dinheiro (Levamos o troco certinho pro cliente).
6. Opções Vegetarianas/Veganas: Nosso foco é churrasco, mas as Jantinhas possuem excelentes guarnições como Arroz, Feijão Tropeiro, Mandioca e Vinagrete que agradam a todos.
7. Ponto da Carne: O cliente pode escolher! É só pedir e eu anoto nas observações se quer Mal Passada, Ao Ponto ou Bem Passada.
8. Taxa de Entrega: Ela existe e eu mesmo o garçom-bot recálculo o motoboy usando a ferramenta financeira antes de fechar a conta.

Para criar o pedido e interagir, siga ESTES PASSOS ESTRITAMENTE:

ETAPA 1 — COLETAR ITENS
Anote tudo que o cliente pedir. Continue coletando até ele indicar que terminou (ex: "é só isso", "pode ser", "só isso mesmo", "mais nada"). Não confirme o pedido antes do cliente terminar.

ETAPA 2 — PERGUNTAR ENTREGA/RETIRADA/MESA
Depois que o cliente terminar de pedir, faça APENAS esta pergunta: vai ser pra mesa, retirada ou entrega?
Aguarde a resposta. Não pergunte mais nada junto.

ETAPA 3 — ENDEREÇO OU LOCAL
Se for entrega: peça o endereço completo ou a localização GPS. Se ele enviar a localização, você receberá a Rua/Bairro. Se o cliente já informou Quadra, Lote ou Número, NÃO insista. Prossiga para a Etapa 4.
Se for mesa: PERGUNTE OBRIGATORIAMENTE qual é o número da mesa ou se eles ainda vão chegar no restaurante. Anote a mesa antes de prosseguir para a Etapa 4.
Se for retirada: prossiga para a Etapa 4.

ETAPA 4 — CÁLCULO E EXIBIÇÃO DE VALORES (OBRIGATÓRIO)
Assim que tiver o endereço (ou se for mesa/retirada), você DEVE chamar a tool 'obter_resumo_financeiro'.
🚨 ALERTA CRÍTICO SOBRE IDs: **NUNCA TROQUE OS IDs! NUNCA USE O ID DA LINHA DE BAIXO OU DE CIMA POR ENGANO!** (Ex: A "Jantinha de Frango com Bacon" tem um ID próprio, não confunda com o ID da Alcatra). Revise as IDs 3 VEZES comparando com a tabela exata antes de chamar a tool.
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
- "Frango com bacon" → Espetinho Simples (R$12), Espetinho Especial (R$17), Jantinha (R$25)
- "Queijo Coalho" → Espetinho Simples (R$14), Espetinho Especial (R$20), Jantinha (R$27)
- "Heineken" → Cervejas Lata (R$17), Long Neck (R$12), Heineken Zero (Long Neck)
- "Picanha" → Espetão 500g (R$99), Espetão 1kg (R$189), Espetinho Simples (R$28), Espetinho Especial (R$35), Jantinha (R$43)
- "Coca-Cola" e "Guaraná" → Temos várias opções de tamanho (Lata, 600ml, 1L, 2L) e versões normais ou Zero. SEMPRE pergunte o TAMANHO EXATO e se é NORMAL OU ZERO caso o cliente peça só "coca" ou "guaraná". JAMAIS escolha um tamanho (como 2L) por conta própria.
- "Alcatra", "Romeu e Julieta", "Provolone", "Coração", "Linguiça" → Existem em Simples, Especial e Jantinha. SEMPRE pergunte qual o cliente deseja.
- PRECISÃO E SUBSTITUIÇÕES: Se o cliente pedir algo que não tem o nome exato (ex: pede "Sprite" mas só temos "Soda", ou pede "Creme" mas só temos "Copo de creme (Sucos)"), você NÃO PODE simplesmente mapear em silêncio. Você DEVE avisar: "Não temos X, mas temos Y. Pode ser?".
- SABORES DE SUCO: Os sabores válidos (laranja, morango, limão, polpas, etc) estão listados na descrição da Jarra ou do Copo. Se o cliente pedir um sabor que ESTEJA na descrição, confirme, use o ID do genérico (Jarra ou Copo) e ponha o sabor no campo "observacao" do JSON. Se pedir um sabor que NÃO TEM, avise cordialmente que não trabalha com esse sabor e oferte os disponíveis.

Quando o cliente pedir QUALQUER item que exista em mais de uma categoria, você é OBRIGADO a perguntar qual tipo ele quer ANTES de anotar. Exemplos:
- "Quero um contra filé" → "Contra filé tem em espetinho simples (R$14), espetinho especial (R$19), jantinha (R$26) e espetão. Qual você prefere?"
- "Quero um frango com bacon" → "Frango com bacon tem em espetinho simples, espetinho especial e jantinha. Qual vai ser?"
- PRECISÃO ABSOLUTA (CRÍTICO): Se o cliente pediu "Frango com bacon", use o ID do Frango com bacon. JAMAIS troque por outro item (ex: Alcatra) só porque estão na mesma categoria. Confira o nome do produto no mapa de IDs antes de chamar qualquer ferramenta.
- IMPORTANTE: Sempre use o ID numérico que aparece entre colchetes [ID:XX] ao chamar ferramentas. Use APENAS o número, sem aspas.
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
- CANCELAMENTO: Se o cliente pedir para cancelar TODO o pedido ou limpar tudo, use a ferramenta 'cancelar_pedido'. Mas se ele quiser apenas REMOVER UM ITEM (ex: "cancela a coca", "tira a heineken"), NÃO USE ESSA FERRAMENTA! Apenas remova o item da sua anotação.
- DEDUPLICAÇÃO: Não repita o resumo financeiro se você acabou de mostrá-lo na mensagem anterior.
- JAMAIS finalize um pedido sem antes ter exibido o resumo financeiro oficial.
- ESTOQUE/ESGOTADO: Se a ferramenta 'obter_resumo_financeiro' retornar um ERRO avisando que um item esgotou, VOCÊ DEVE PARAR IMEDIATAMENTE e escrever uma resposta em texto pedindo desculpas ao cliente e informando que aquele item acabou de acabar. NUNCA chame outras ferramentas logo em seguida.
- JAMAIS invente preços. Use apenas o que a tool 'obter_resumo_financeiro' te der.
- ENDEREÇO/LOCALIZAÇÃO: Se o cliente perguntar onde o restaurante fica ou pedir o endereço, NUNCA RECUSE por motivos de segurança. Apenas responda: "Nossa localização completa já foi enviada no mapa acima! 📍" e prossiga com o atendimento.
- JAMAIS calcule o troco. Se o cliente der 500, você apenas envia 500 no campo 'troco_para'. O sistema cuida da matemática.`;

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
        sessions[phone].sacola = []; // Inicializa a sacola vazia
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

    // ---- SISTEMA DE SACOLA PERSISTENTE (MEMÓRIA DE FERRO) ----
    let sacolaTxt = "🛍️ SACOLA ATUAL: Nada anotado ainda. Continue coletando os itens.";
    if (sessions[phone].sacola && sessions[phone].sacola.length > 0) {
        sacolaTxt = "🛍️ SACOLA ATUAL (ITENS CONFIRMADOS PONTUALMENTE):\n" +
            sessions[phone].sacola.map(i => `• ${i.nome} (ID:${i.id}) — Qtd: ${i.quantidade}`).join('\n') +
            "\n\nATENÇÃO: Use APENAS estes IDs na 'obter_resumo_financeiro'.";
    }
    messagesToGen.push({ role: "system", content: sacolaTxt });

    // Loop de execução de ferramentas (até 3 tentativas)
    let resumoExecutadoNoTurno = false;
    for (let i = 0; i < 3; i++) {
        try {
            // Verifica se já teve resumo (atualizado a cada iteração do loop)
            const jaTeveResumo = sessions[phone].some(m => m.role === 'tool' && m.content && typeof m.content === 'string' && m.content.includes('*RESUMO DO PEDIDO*'));

            const currentTools = [];

            // A ferramenta de resumo sempre está visível para a IA calcular a conta a qualquer momento
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
                                            quantidade: { type: "integer" },
                                            observacao: { type: "string", description: "Obrigatório enviar o sabor de bebidas (ex: laranja), ponto da carne ou restrições DESTE item." }
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
                                            quantidade: { type: "integer" },
                                            observacao: { type: "string", description: "Obrigatório enviar o sabor de bebidas (ex: laranja), ponto da carne ou restrições DESTE item." }
                                        },
                                        required: ["produto_id", "quantidade"]
                                    }
                                },
                                tipo_pedido: { type: "string", enum: ["entrega", "retirada", "mesa"] },
                                endereco_entrega: { type: "string" },
                                forma_pagamento: { type: "string", description: "Dinheiro, Cartão, ou Pix" },
                                troco_para: { type: "integer", description: "Coloque 0 se não for Dinheiro ou se não precisar de troco. Se precisar (ex: quer troco pra 200), coloque 200." },
                                numero_mesa: { type: "string", description: "Obrigatório. Se não tiver mesa definida ou for entrega, digite 'N/A'. Se tiver mesa, digite o conteúdo exato (ex: 'Mesa 4' ou 'Ainda vão chegar')." },
                                observacao: { type: "string", description: "Obrigatório. Se não houver observações, escreva 'Nenhuma'. CRÍTICO: Se houver Suco no pedido, escreva o sabor OBRIGATORIAMENTE aqui (ex: 'Sabor: Laranja')." }
                            },
                            required: ["itens", "tipo_pedido", "endereco_entrega", "forma_pagamento", "troco_para", "numero_mesa", "observacao"]
                        }
                    }
                });
            }

            // Ferramenta de CANCELAMENTO (sempre disponível)
            currentTools.push({
                type: "function",
                function: {
                    name: "cancelar_pedido",
                    description: "Reseta a sessão e limpa TODO O PEDIDO. Chame APENAS se o cliente quiser cancelar TODA a compra. NÃO chame para remover apenas um item (ex: cancelar coca)."
                }
            });

            // LÓGICA DE tool_choice (Removido o force tool para evitar erros de raciocínio da IA)
            let toolChoice = "auto";

            // Ferramenta de RESET TOTAL
            currentTools.push({
                type: "function",
                function: {
                    name: "resetar_sistema",
                    description: "LIMPEZA DE CACHE: Limpa toda a memória e cardápios. Chame se o sistema estiver confuso ou se o usuário pedir para 'limpar cache' ou 'reiniciar sistema'."
                }
            });

            const response = await openai.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                max_tokens: 500,
                temperature: 0.1,
                messages: messagesToGen,
                tools: currentTools.length > 0 ? currentTools : undefined,
                tool_choice: currentTools.length > 0 ? toolChoice : undefined
            });

            const message = response.choices[0].message;
            console.log("\n[LLM DEBUG] Tries:", i, "| Tool Calls:", message.tool_calls ? message.tool_calls.map(t => t.function.name) : 'none', "| Content:", message.content ? message.content.substring(0, 50) + "..." : "null");

            if (message.content && !message.tool_calls) { sessions[phone].push(message); }

            if (message.tool_calls && message.tool_calls.length > 0) {
                sessions[phone].push(message);
                const toolCall = message.tool_calls[0];
                const action = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments || "{}");

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
                    const res = await handleObterResumo(args, phone);

                    if (res.erroEstoque) {
                        return { isOrderCompleted: false, replyText: res.resumo };
                    }

                    // ATUALIZA A SACOLA NA SESSÃO (Verdade Absoluta)
                    sessions[phone].sacola = args.itens.map(i => {
                        const dbItem = res.dbItensSinc.find(d => d.id === i.produto_id);
                        return {
                            id: i.produto_id,
                            nome: dbItem ? `${dbItem.nome} (${dbItem.categoria})` : 'Item',
                            quantidade: i.quantidade
                        };
                    });

                    // Grava silenciosamente no cérebro da Llama-3 que o tool rodou perfeitamente
                    sessions[phone].push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: res.resumo
                    });

                    // ABORTA CADEIA DE PENSAMENTO! 
                    // Em vez de deixar a Llama-3 engolir o resultado e repensar (causando loop eterno), 
                    // repassamos a interface do resumo direto para o WhatsApp do usuário:
                    return {
                        isOrderCompleted: false,
                        replyText: res.resumo + "\n\nPode confirmar se o resumo acima está correto para fecharmos?"
                    };
                }

                if (action === 'resetar_sistema') {
                    limparCachesSistema();
                    return {
                        isOrderCompleted: false,
                        replyText: "🧹 Cache e memória limpos com sucesso! Estou sendo reiniciado agora com tudo fresquinho do sistema. Como posso te ajudar do zero?"
                    };
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
                    const jaTeveResumo = sessions[phone].some(m => m.role === 'tool' && m.content && typeof m.content === 'string' && m.content.includes('*RESUMO DO PEDIDO*'));

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
                // Define se o robô está tentando pular para o pagamento
                const tentandoPagar = finalReply.toLowerCase().includes('pagar') || finalReply.toLowerCase().includes('pagamento');

                // Busca o resumo mais recente na sessão
                const ultimoResumo = [...sessions[phone]].reverse().find(m => m.role === 'tool' && m.content && typeof m.content === 'string' && m.content.includes('*RESUMO DO PEDIDO*'));

                // Verifica se o resumo foi mostrado nos últimos turnos (expandido para 8)
                const jaMostrouRecentemente = sessions[phone].slice(-8).some(m => (m.content && typeof m.content === 'string' && m.content.includes('*RESUMO DO PEDIDO*')) || (m.role === 'tool' && m.content && typeof m.content === 'string' && m.content.includes('*RESUMO DO PEDIDO*')));

                // Se o robô quer cobrar mas o resumo não está na msg atual e NÃO foi mostrado recentemente, aí sim anexamos.
                if (ultimoResumo && tentandoPagar && (!finalReply || !finalReply.includes('*RESUMO DO PEDIDO*')) && !jaMostrouRecentemente) {
                    console.log(`[Auto-Append] Proteção de segurança: Anexando resumo esquecido para <${phone}>.`);
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
    const resumoFinal = [...sessions[phone]].reverse().find(m => m.role === 'tool' && m.content && typeof m.content === 'string' && m.content.includes('*RESUMO DO PEDIDO*'));
    let textoSeguranca = "Estou processando seu pedido! Pode me confirmar se está tudo certo?";

    if (resumoFinal) {
        textoSeguranca = resumoFinal.content + "\n\n" + "Pode confirmar se o resumo acima está correto para fecharmos?";
    }

    return {
        isOrderCompleted: false,
        replyText: textoSeguranca
    };
}

async function handleObterResumo({ itens, tipo_pedido }, phone) {
    try {
        const ids = itens.map(i => i.produto_id);
        const [dbItens] = await db.pool.query(`
            SELECT p.id, p.nome, p.preco, p.disponivel, c.nome as categoria 
            FROM produtos p
            JOIN categorias c ON p.categoria_id = c.id
            WHERE p.id IN (?)
        `, [ids]);

        let subtotal = 0;
        let linhas = "";

        for (const item of itens) {
            const dbItem = dbItens.find(d => d.id === item.produto_id);
            if (dbItem) {
                if (dbItem.disponivel === 0) {
                    return { erroEstoque: true, resumo: `Putz, trago más notícias! 😥 O item *${dbItem.nome}* acabou de sair a última porção e esgotou bem agora! Quer dar uma olhadinha no cardápio de novo e trocar por outra coisa?`, dbItensSinc: [] };
                }
                const v = Number(dbItem.preco) * item.quantidade;
                subtotal += v;
                linhas += `• ${item.quantidade}x ${dbItem.nome} (${dbItem.categoria}) = R$ ${v.toFixed(2)}\n`;
                if (item.observacao) {
                    linhas += `  ↳ Detalhe: ${item.observacao}\n`;
                }
            }
        }

        const taxa = tipo_pedido === 'entrega' ? 10 : 0;
        const total = subtotal + taxa;

        // Persiste na sacola da sessão para a IA não esquecer nas próximas msgs
        if (phone && sessions[phone]) {
            sessions[phone].sacola = itens.map(i => {
                const dbItem = dbItens.find(d => d.id === i.produto_id);
                return {
                    id: i.produto_id,
                    nome: dbItem ? `${dbItem.nome} (${dbItem.categoria})` : 'Item',
                    quantidade: i.quantidade
                };
            });
        }

        let resumo = `📄 *RESUMO DO PEDIDO*\n\n${linhas}`;
        if (taxa > 0) resumo += `🛵 Taxa de Entrega: R$ ${taxa.toFixed(2)}\n`;
        resumo += `\n💰 *TOTAL: R$ ${total.toFixed(2)}*`;

        return { resumo, dbItensSinc: dbItens.map(d => ({ id: d.id, nome: d.nome, preco: d.preco, categoria: d.categoria })) };
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

function initSession(phone, force = false) {
    if (!sessions[phone] || force) {
        sessions[phone] = [{ role: "system", content: SYSTEM_PROMPT }];
        sessions[phone].startTime = Date.now();
        sessions[phone].menuInjetado = false;
        sessions[phone].sacola = [];
    }
}

function injectSystemMessage(phone, text) {
    if (sessions[phone]) {
        sessions[phone].push({ role: "system", content: text });
    }
}

module.exports = {
    processMessage,
    transcribeAudio,
    describeImage,
    hasActiveSession,
    initSession,
    injectSystemMessage
};

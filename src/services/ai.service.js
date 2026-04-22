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

ETAPA 1 — COLETAR ITENS E RESOLVER AMBIGUIDADES
Anote tudo que o cliente pedir. Continue coletando até ele indicar que terminou (ex: "é só isso", "pode ser", "só isso mesmo", "mais nada"). 
🚨 PROIBIÇÃO: JAMAIS liste os itens que você anotou por conta própria (ex: "Entendi, você pediu X e Y"). Apenas confirme com frases curtas como "Anotado! Mais alguma coisa?".
🚨 ATENÇÃO ÀS CATEGORIAS (MUITO IMPORTANTE):
Se o cliente pedir "Frango com bacon", procure na lista abaixo. Você verá que existe em "ESPETINHO SIMPLES" (um ID) e em "JANTINHAS" (outro ID).
Se o sistema avisou que o cliente estava olhando a categoria Jantinhas, VOCÊ DEVE pegar o ID que está debaixo de "=== CATEGORIA: JANTINHAS ===". Não pegue o primeiro que achar!
Se você não sabe a categoria, PERGUNTE: "Você quer na Jantinha ou no Espetinho?". NUNCA ADIVINHE O ID.

ETAPA 2 — ENTREGA OU RETIRADA
DEPOIS que o cliente confirmar que terminou de pedir os itens, pergunte se será para ENTREGA ou RETIRADA (Não temos consumo na mesa/local).
Aguarde a resposta. Não chame NENHUMA ferramenta ainda.

ETAPA 3 — ENDEREÇO (SOMENTE ENTREGA)
Se o cliente escolheu entrega, peça o endereço completo. O sistema exige OBRIGATORIAMENTE: RUA, QUADRA, LOTE, NÚMERO E BAIRRO. 
Se faltar QUALQUER UM desses 5 itens, insista educadamente.
Se for retirada, pule esta etapa.

ETAPA 4 — RESUMO DOS ITENS
🚨 REGRA CRÍTICA: VOCÊ NÃO TEM PERMISSÃO para chamar a ferramenta 'obter_resumo_pedido' ANTES de ter a resposta exata se é Entrega ou Retirada, e ANTES de ter o endereço COMPLETO (caso seja entrega).
Assim que cumprir os requisitos acima, chame a tool 'obter_resumo_pedido'.
Esta tool vai listar apenas os pratos escolhidos (SEM VALORES) para que o cliente confirme se não esqueceu de nada.
Você NÃO sabe os preços. O sistema montará a lista.
Mostre o resumo EXATAMENTE como a tool devolver e faça a seguinte pergunta:
"Pode confirmar se o resumo acima está correto para continuarmos?"

ETAPA 5 — FINALIZAR E CHAMAR HUMANO
Assim que o cliente disser "sim" ou confirmar o resumo, você DEVE parar e chamar IMEDIATAMENTE a tool 'confirmar_pedido_e_chamar_humano'.
NÃO calcule taxas e NÃO pergunte a forma de pagamento. O Humano vai assumir o chat, calcular o total e perguntar a forma de pagamento.

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
- CANCELAMENTO: Se o cliente pedir para cancelar TODO o pedido ou limpar tudo, use a ferramenta 'cancelar_pedido'. Mas se ele quiser apenas REMOVER UM ITEM (ex: "cancela a coca", "tira a heineken"), NÃO USE ESSA FERRAMENTA! Apenas remova o item da sua anotação.
- DEDUPLICAÇÃO: Não repita o resumo se você acabou de mostrá-lo na mensagem anterior.
- JAMAIS finalize um pedido sem antes ter exibido o resumo oficial.
- ESTOQUE/ESGOTADO: Se a ferramenta 'obter_resumo_pedido' retornar um ERRO avisando que um item esgotou, VOCÊ DEVE PARAR IMEDIATAMENTE e escrever uma resposta em texto pedindo desculpas ao cliente e informando que aquele item acabou de acabar. NUNCA chame outras ferramentas logo em seguida.
- JAMAIS invente preços nem mencione o total da compra.
- ENDEREÇO/LOCALIZAÇÃO: Se o cliente perguntar onde o restaurante fica ou pedir o endereço, NUNCA RECUSE por motivos de segurança. Apenas responda: "Nossa localização completa já foi enviada no mapa acima! 📍" e prossiga com o atendimento.`;

const sessions = {};

// ============================================================
// PROCESSADOR DE MENSAGEM
// ============================================================
async function processMessage(phone, text) {
    // Verifica se a sessão foi assumida pelo humano
    if (sessions[phone] && sessions[phone].isHumanPaused) {
        return { isOrderCompleted: false, replyText: null }; // Bot silenciado
    }

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
            "\n\nATENÇÃO: Use APENAS estes IDs na 'obter_resumo_pedido'.";
    }
    messagesToGen.push({ role: "system", content: sacolaTxt });

    // Loop de execução de ferramentas (até 3 tentativas)
    let resumoExecutadoNoTurno = false;
    for (let i = 0; i < 3; i++) {
        try {
            // Verifica se já teve resumo (atualizado a cada iteração do loop)
            const jaTeveResumo = sessions[phone].some(m => m.role === 'tool' && m.content && typeof m.content === 'string' && m.content.includes('*RESUMO DO PEDIDO*'));

            const currentTools = [];

            // A ferramenta de resumo
            currentTools.push({
                type: "function",
                function: {
                    name: "obter_resumo_pedido",
                        description: "Gera a lista de itens limpa (sem preços). CHAME APENAS DEPOIS de ter o endereço completo (para entrega) ou após o cliente escolher retirada.",
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
                                tipo_pedido: { type: "string", enum: ["entrega", "retirada"] }
                            },
                            required: ["itens", "tipo_pedido"]
                        }
                    }
                });

            // SÓ LIBERA 'confirmar_pedido_e_chamar_humano' se o resumo já tiver sido gerado
            if (jaTeveResumo) {
                currentTools.push({
                    type: "function",
                    function: {
                        name: "confirmar_pedido_e_chamar_humano",
                        description: "FECHAMENTO: Chame APENAS após o cliente dizer 'sim' confirmando o resumo gerado.",
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
                                tipo_pedido: { type: "string", enum: ["entrega", "retirada"] },
                                endereco_entrega: { type: "string", description: "Vazio se for retirada. Endereço se for entrega." },
                                observacao: { type: "string", description: "Obrigatório. Se não houver observações, escreva 'Nenhuma'." }
                            },
                            required: ["itens", "tipo_pedido", "endereco_entrega", "observacao"]
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

                if (action === 'obter_resumo_pedido') {
                    // GUARDRAIL RÍGIDO E ABSOLUTO: Verifica se o usuário chegou a mencionar entrega ou retirada em algum momento
                    const userMentionedType = sessions[phone].some(m => m.role === 'user' && /(entrega|retirad|entregar|buscar|levar|aqui)/i.test(m.content));
                    if (!userMentionedType) {
                        return { 
                            isOrderCompleted: false, 
                            replyText: "Por favor, antes de eu gerar o seu resumo, me confirme: vai ser para *Entrega* ou *Retirada*?" 
                        };
                    }
                    
                    // Verifica se o endereço foi coletado (se for entrega)
                    if (args.tipo_pedido === 'entrega') {
                        const userMentionedAddress = sessions[phone].some(m => m.role === 'user' && /(rua|avenida|av|qd|quadra|lt|lote|bairro|casa|apto|apartamento)/i.test(m.content));
                        if (!userMentionedAddress) {
                            return { 
                                isOrderCompleted: false, 
                                replyText: "Como é para entrega, preciso do seu endereço completo por favor! (Rua, Quadra, Lote, Número e Bairro)." 
                            };
                        }
                    }

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
                    return {
                        isOrderCompleted: false,
                        replyText: res.resumo + "\n\nPode confirmar se o resumo acima está correto para continuarmos?"
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

                if (action === 'confirmar_pedido_e_chamar_humano') {
                    // GUARDRAIL: Verifica se o resumo já foi gerado nesta sessão
                    const jaTeveResumo = sessions[phone].some(m => m.role === 'tool' && m.content && typeof m.content === 'string' && m.content.includes('*RESUMO DO PEDIDO*'));

                    if (!jaTeveResumo) {
                        console.log(`[Guardrail] Bloqueando confirmar_pedido_e_chamar_humano para <${phone}>: Resumo ausente.`);
                        sessions[phone].push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: "AVISO DO SISTEMA: Você não pode confirmar sem antes listar o resumo. Chame AGORA a tool 'obter_resumo_pedido' primeiro."
                        });
                        continue; // Força a IA a reconsiderar
                    }

                    // Silencia o robô para o humano assumir
                    sessions[phone].isHumanPaused = true;
                    
                    // Injeta dados padrão para a criação da comanda e impressão na cozinha
                    args.forma_pagamento = "A COMBINAR";
                    args.troco_para = 0;
                    args.taxa_entrega = 0;
                    args.tempo_fechamento_segundos = Math.round((Date.now() - sessions[phone].startTime) / 1000);
                    
                    // NÃO DELETA A SESSÃO, para manter o robô silenciado
                    return {
                        isOrderCompleted: true,
                        orderData: args,
                        replyText: "Perfeito! Já mandei seu pedido para a cozinha começar a preparar! 🥩🔥\n\n*Aguarde um momento: nosso atendente humano já vai assumir o chat para te passar os valores totais e confirmar a forma de pagamento com você.* 👨‍💼"
                    };
                }
            }

            // Se for uma resposta de texto, verifica se precisa anexar o resumo financeiro oficial
            let finalReply = message.content;

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
        textoSeguranca = resumoFinal.content + "\n\n" + "Pode confirmar se o resumo acima está correto para continuarmos?";
    }

    return {
        isOrderCompleted: false,
        replyText: textoSeguranca
    };
}

const beeService = require('./bee.service');

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
                linhas += `• ${item.quantidade}x ${dbItem.nome} (${dbItem.categoria})\n`;
                if (item.observacao) {
                    linhas += `  ↳ Detalhe: ${item.observacao}\n`;
                }
            }
        }

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

        return { resumo, dbItensSinc: dbItens.map(d => ({ id: d.id, nome: d.nome, preco: d.preco, categoria: d.categoria })) };
    } catch (e) {
        return "Erro ao montar o resumo. Por favor, verifique os nomes dos itens.";
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
            model: "llama-3.2-11b-vision-preview",
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
        sessions[phone].isHumanPaused = false;
    }
}

function isHumanPaused(phone) {
    return sessions[phone] ? sessions[phone].isHumanPaused : false;
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
    injectSystemMessage,
    isHumanPaused
};

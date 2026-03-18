const { OpenAI } = require('openai');
const db = require('../config/db');
require('dotenv').config();

// Cliente Core Groq (Código 100% Limpo e Elegante)
const openai = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `
Você é o atendente virtual da "Léo churrascaria".
Sua função é atender os clientes do WhatsApp de forma EXTREMAMENTE humanizada e informal (sem parecer um robô).

PERSONALIDADE E DIRETRIZES DE IA:
- Você é EXTREMAMENTE PROIBIDO de "pensar em voz alta" de forma técnica ou repetir passos operacionais para o cliente! (Ex: Nunca repita 'Eu tenho que preencher este formulário' ou 'Estou seguindo passos na ordem'). Fale como um garçom de carne e osso no celular da churrascaria.
- Se apresente de forma aconchegante! "Olá, tudo bem? Como posso te servir hoje?"

CARDÁPIO ENXUTO (Estritamente OBRIGATÓRIO Ocultar a string [ID] da Exibição Visual ao Cliente. O [ID] é seu segredo para a finalização da tool):
{CARDAPIO}

COMO COLETAR CHECKOUT (Faça de forma natural e humanizada):
1. JAMAIS faça conta de matemática nem tente exibir ao cliente o "VALOR TOTAL SOMADO" da venda!!! Modelos de IA erram somas fracionárias causando divergência e prejuízo no caixa físico que calculará sozinho. Limite-se APENAS a ler a quantidade de escolhas dele. (Ex> "Tudo anotado: 5 Picanhas, 3 Cervejas").
2. Sempre pergunte se o pedido será servido na MESA, RETIRADA ou ENTREGA em domicílio.
3. Se o cliente disser ENTREGA, aí sim (e EXCLUSIVAMENTE NESSA HORA) você avisa sutilmente da taxa de entrega em R$ 10.00 fixa e pede logo em seguida o Endereço Completo.
4. Se o cliente disser RETIRADA/MESA: Você fica MUDO E DEIXA A TAXA EM ZERO. Não comente taxa e não cobre endereço!
5. Depois de entender a logística, solicite a pessoa que especifique a FORMA DE PAGAMENTO (Se é dinheiro com troco, Pix ou Cartão).
6. Quando ele confirmar tudo, encerre super bem o Chat avisando que a cozinha recebeu o envio e silenciosamente chame a sua tool API 'finalizar_pedido' com todos os dados.
`;

const sessions = {}; // Armazena contexto

async function getCardapioText() {
    try {
        const [produtos] = await db.pool.query('SELECT p.id, p.nome, p.preco, c.nome as categoria FROM produtos p JOIN categorias c ON p.categoria_id = c.id WHERE p.disponivel = 1 ORDER BY c.id');
        let text = "";
        let currentCat = "";
        for (const p of produtos) {
            if (p.categoria !== currentCat) {
                currentCat = p.categoria;
                text += `\n*${currentCat}*\n`;
            }
            text += `[ID ${p.id}] ${p.nome} - R$ ${p.preco}\n`;
        }
        return text;
    } catch (e) {
        console.error("Erro ao puxar BD:", e.message);
        return `
*Carnes*
[ID 1] Picanha - R$ 89.90
[ID 2] Maminha - R$ 69.90

*Bebidas*
[ID 6] Coca-Cola 2L - R$ 14.00
`;
    }
}

async function processMessage(phone, text) {
    if (!sessions[phone]) {
        const cardapio = await getCardapioText();
        sessions[phone] = [
            { role: "system", content: SYSTEM_PROMPT.replace('{CARDAPIO}', cardapio) }
        ];
        sessions[phone].startTime = Date.now(); // Cronômetro CRM Zero
    }

    sessions[phone].push({ role: "user", content: text });

    try {
        const response = await openai.chat.completions.create({
            model: "llama-3.3-70b-versatile", // Modelo principal de apresentação
            messages: sessions[phone],
            tools: [
                {
                    type: "function",
                    function: {
                        name: "finalizar_pedido",
                        description: "Chame esta função APENAS quando o cliente CONFIRMAR a entrega do pedido final.",
                        parameters: {
                            type: "object",
                            properties: {
                                itens: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            produto_id: { type: "integer", description: "O ID numérico do produto correspondente no cardápio" },
                                            quantidade: { type: "integer", description: "Quantidade solicitada" }
                                        },
                                        required: ["produto_id", "quantidade"]
                                    }
                                },
                                tipo_pedido: { type: "string", description: "Exatamente: 'entrega', 'retirada' ou 'mesa'" },
                                endereco_entrega: { type: "string", description: "O endereço completo (apenas se for entrega). Em branco se for retirada/mesa." },
                                forma_pagamento: { type: "string", description: "A forma de pagamento e se precisa de troco (ex: 'Dinheiro para 100', 'Cartão' ou 'Pix')" },
                                observacao: { type: "string", description: "Observações do cliente, como 'sem cebola' etc." }
                            },
                            required: ["itens", "tipo_pedido"]
                        }
                    }
                }
            ],
            tool_choice: "auto"
        });

        const message = response.choices[0].message;
        sessions[phone].push(message);

        // Verifica se a IA acionou a tool (Function Call)
        if (message.tool_calls && message.tool_calls.length > 0) {
            const toolCall = message.tool_calls[0];
            if (toolCall.function.name === 'finalizar_pedido') {
                const args = JSON.parse(toolCall.function.arguments);
                
                // Calcula tempo de fechamento
                const tempo_fechamento_segundos = Math.round((Date.now() - sessions[phone].startTime) / 1000);
                args.tempo_fechamento_segundos = tempo_fechamento_segundos;

                // Reseta a sessão após a finalização
                delete sessions[phone];
                
                return {
                    isOrderCompleted: true,
                    orderData: args,
                    replyText: "Pedido recebido e confirmado com sucesso! 🥩🔥 A comanda foi disparada e a cozinha já está preparando."
                };
            }
        }

        return {
            isOrderCompleted: false,
            replyText: message.content
        };

    } catch (error) {
        console.error("Groq API Error:", error.message || error);
        return {
            isOrderCompleted: false,
            replyText: "Desculpe, meu sistema está com uma instabilidade técnica no momento. Pode tentar novamente em alguns minutos?"
        };
    }
}

const fs = require('fs');
const path = require('path');
const os = require('os');

async function transcribeAudio(base64Data) {
    try {
        const tempPath = path.join(os.tmpdir(), `audio_${Date.now()}.ogg`);
        fs.writeFileSync(tempPath, Buffer.from(base64Data, 'base64'));
        
        const response = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempPath),
            model: "whisper-large-v3"
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
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "O usuário enviou uma imagem no WhatsApp no meio de um autoatendimento de churrascaria. Leia detalhadamente o assunto nela e/ou descreva o que ela significa para passar de contexto ao assistente textual inteligente. Seja descritivo e conciso." },
                        { type: "image_url", image_url: { url: `data:${mimetype};base64,${base64Data}` } }
                    ]
                }
            ],
            max_tokens: 300,
        });
        return `[Anexo de Imagem recebido: ${response.choices[0].message.content}]`;
    } catch (e) {
        console.error("Erro na Llama Vision:", e.message);
        return "[Imagem recebida, mas falhou a decodificação da IA]";
    }
}

module.exports = {
    processMessage,
    transcribeAudio,
    describeImage
};

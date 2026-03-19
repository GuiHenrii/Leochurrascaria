# 🍢 Léo Churrascaria — Ecossistema de Atendimento Inteligente (v3)

Seja bem-vindo ao repositório da **Léo Churrascaria**, um ecossistema completo que une Inteligência Artificial de ponta e um CRM de alta performance para revolucionar o atendimento por WhatsApp.

---

## 🚀 Visão Geral

O projeto consiste em duas partes principais que trabalham juntas em tempo real:
1.  **🤖 O Garçom Virtual (Bot IA)**: Um assistente inteligente rodando Llama 3.3 70B (via Groq) que entende áudio, imagens e localização GPS.
2.  **📊 Dashboard CRM Premium**: Um painel de controle administrativo com estética "Neon Red & Black" para monitorar vendas, tempo de atendimento e gerir estoque.

---

## ✨ Funcionalidades Principais

### 1. Atendimento por IA (WhatsApp)
*   **🧠 Memória de Cliente**: O bot reconhece clientes antigos e sugere "o de sempre", criando uma experiência personalizada.
*   **🎙️ Transcrição de Áudio**: Entende pedidos enviados por voz usando Whisper.
*   **👁️ Visão Computacional**: Consegue descrever imagens enviadas pelo cliente (ex: fotos de comprovantes ou pratos).
*   **📍 Localização GPS**: Aceita localização em tempo real e faz a geocodificação reversa para identificar a rua do cliente.
*   **🛒 Checkout Inteligente**: Gera resumos financeiros, calcula taxas de entrega e gerencia formas de pagamento.

### 2. Painel Administrativo (CRM)
*   **📈 Métricas em Tempo Real**: Visualize Receita Total, Quantidade de Vendas e Tempo Médio de Atendimento.
*   **🔴 Indicador Live 24/7**: Um badge animado que confirma a sincronia constante com o servidor.
*   **📋 Log de Pedidos Reais**: Uma tabela de alta definição (Glassmorphism) que mostra os últimos pedidos enquanto eles acontecem.
*   **🥩 Controle de Estoque (One-Click)**: Aba exclusiva para ativar ou desativar produtos. Se um item é marcado como "Esgotado", a IA para de oferecê-lo no WhatsApp instantaneamente.

### 3. Estética "Enterprise BBQ"
*   Design futurista inspirado em casas de carne de luxo.
*   Efeitos de **Glassmorphism** e brilho **Neon Red**.
*   Fundo Cinematic HD e animações suaves de transição.

---

## 🛠️ Tecnologias Utilizadas

*   **Backend**: Node.js & Express
*   **Banco de Dados**: MySQL (com migrações automáticas integradas)
*   **IA / LLM**: Llama 3.3 70B (Groq Cloud) & OpenAI Whisper
*   **WhatsApp**: WhatsApp-web.js
*   **Frontend**: Vanilla HTML5, CSS3 (Modern Hooks) e JavaScript (Real-time Polling)

---

## ⚙️ Como Executar

1.  **Clone o repositório**:
    ```bash
    git clone https://github.com/GuiHenrii/Leochurrascaria.git
    ```

2.  **Instale as dependências**:
    ```bash
    npm install
    ```

3.  **Configure o `.env`**:
    Crie um arquivo `.env` na raiz com as chaves:
    *   `GROQ_API_KEY`
    *   `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`

4.  **Inicie o sistema**:
    ```bash
    npm start
    ```

5.  **Acesse o CRM**:
    Abra `http://localhost:3000` no seu navegador.

---

## 📄 Licença

Este projeto foi desenvolvido para a operação exclusiva da **Léo Churrascaria**. Proibida a reprodução sem autorização.

---
*Desenvolvido com ❤️ e muita brasa!* 🍖🔥✨

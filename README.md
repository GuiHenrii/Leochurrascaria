# 🍖 Léo Churrascaria - Sistema de Autoatendimento Inteligente v3.0

![Status](https://img.shields.io/badge/Status-Operacional-brightgreen)
![Version](https://img.shields.io/badge/Version-3.0_Pro-red)
![Tech](https://img.shields.io/badge/Tech-Node.js_%7C_MySQL_%7C_Groq_IA-orange)

O **Léo Churrascaria CRM & Bot** é uma solução completa de autoatendimento via WhatsApp integrada a um Dashboard de Gestão em tempo real. Desenvolvido para transformar o atendimento de churrascarias, tornando-o mais rápido, inteligente e lucrativo.

---

## 🚀 Funcionalidades Principais

### 🤖 1. IA com "Consciência de Estoque"
O Garçom Virtual (Léo) não é apenas um chatbot, é um atendente inteligente que:
- **Sincronia Real-Time**: Sabe instantaneamente se um item esgotou no CRM e para de oferecê-lo.
- **Memória de Fidelidade**: Identifica clientes antigos e sugere seus pratos favoritos baseados no histórico.
- **Venda Consultiva**: Sugere bebidas e acompanhamentos de forma natural, aumentando o ticket médio.
- **Multimodal**: Entende áudios de pedidos e lê localizações via GPS do WhatsApp.

### 📊 2. Dashboard CRM Pró (Estética Neon)
Um painel administrativo de última geração com:
- **Métricas Vivas**: Gráficos de receita total, volume de pedidos e tempo médio de atendimento.
- **Log de Pedidos Grid**: Visualização organizada e ultra-alinhada de todos os pedidos em andamento.
- **Gestão de Itens**: Controle de disponibilidade (Ativo/Esgotado) com um clique.
- **Zerar Base**: Função para limpeza de métricas para novos turnos.

### 🛵 3. Fluxo de Entrega Inteligente
- Cálculo automático de taxa de entrega (R$ 10,00 padrão).
- Coleta rigorosa de endereço e forma de pagamento.
- **Impressão de Comanda**: Geração de comanda formatada para a cozinha (mockup offline incluso).

---

## 🛠️ Stack Tecnológica

- **Backend**: Node.js com Express.js
- **Banco de Dados**: MySQL 8.0 (Pool de Conexões de Alta Performance)
- **IA/LLM**: Groq (Llama 3.3 70B) para respostas ultra-rápidas
- **WhatsApp**: WhatsApp-Web.js
- **Frontend**: HTML5, Vanilla CSS (Glassmorphism), JavaScript (Real-time polling)

---

## 📋 Como Rodar o Projeto

1. **Configuração do Ambiente**:
   - Renomeie o arquivo `.env.example` para `.env` e preencha suas chaves da Groq e credenciais do MySQL.
   
2. **Instalação**:
   ```bash
   npm install
   ```

3. **Inicialização**:
   ```bash
   npm start
   ```

4. **Acesso ao CRM**:
   Acesse `http://localhost:3000` no seu navegador.

---

## 📄 Notas da Versão v3.0
- Refatoração completa do layout para CSS Grid.
- Implementação de injeção dinâmica de estoque no contexto da IA.
- Correção de bugs críticos de segurança e loops de ferramentas.
- Adição de sistema de abas modular no frontend.

---
*Desenvolvido com ❤️ para a melhor experiência em churrasco.* 🥩🔥

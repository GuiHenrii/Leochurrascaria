# 🍖 Léo Churrascaria - Sistema de Autoatendimento Inteligente v1.1.0 (Produção)

![Status](https://img.shields.io/badge/Status-Operacional-brightgreen)
![Version](https://img.shields.io/badge/Version-v1.1.0_PRO-red)
![Tech](https://img.shields.io/badge/Tech-Node.js_%7C_MySQL_%7C_Groq_Llama3-orange)
![Spooler](https://img.shields.io/badge/Spooler-Instalado-blue)

O **Léo Churrascaria CRM & Bot** é uma solução completa de autoatendimento via WhatsApp acoplada a um Dashboard de Gestão em tempo real e a uma **Arquitetura Desacoplada de Impressão (Spooler Local)**. Desenvolvido para transformar o atendimento de churrascarias, tornando-o imune a falhas de rede e super rápido.

---

## 🚀 Arquitetura 100% Funcional (VPS + Local)

O sistema agora funciona em **duas camadas** independentes para garantir que a sua impressora térmica local imprima os pedidos mesmo que o backend da IA esteja hospedado numa VPS (Nuvem).

### ☁️ 1. O Cérebro (Nuvem / Servidor Principal)
Roda o Bot do WhatsApp, a IA Llama-3 e o Painel CRM Web.
- **Sincronia Real-Time**: Sabe instantaneamente se um item esgotou no CRM e para de oferecê-lo.
- **Prevenção de Halucinações**: Mapeamento inteligente que proíbe a IA de inventar sabores ou de listar os IDs internos do SQL para os clientes.
- **Painel CRM Web (Porta 3000)**: Gestão de estoque com 1 clique e logs ao vivo.

### 🖨️ 2. O Braço de Impressão (Spooler Local Windows)
Roda fisicamente no computador do Caixa/Balcão da Churrascaria.
- **Assíncrono e Seguro**: Um script Node.js (`app-impressora.js`) que puxa os pedidos da Nuvem a cada 5 segundos.
- **Trava de Corrida (Race Condition Fix)**: Impede que a impressora puxe cupons vazios no meio da consulta de dados.
- **Auto-Inicialização**: Sobrevive a quedas de luz e reinícios automáticos rodando em background no Windows.

---

## 📋 Como Rodar o Projeto

Para o sistema estar **100% Funcional**, nós "ligamos" as duas pontas.

### PARTE 1: Ligando o Cérebro (WhatsApp + CRM)
1. Preencha seu `.env` com as senhas do MySQL e o `GROQ_API_KEY`.
2. Instale as dependências: `npm install`
3. Rode o servidor principal:
   ```bash
   npm start
   ```
4. O Painel CRM estará em `http://localhost:3000`.

### PARTE 2: Ligando a Impressora Local (Spooler)
1. No PC do caixa do restaurante, o MySQL nem precisa estar rodando localmente! Configure o `.env` apenas com a URL da API da Nuvem.
2. Certifique-se de que a impressora térmica está instalada nos drives do Windows e compartilhada na rede / porta USB.
3. Inicie o Spooler dando um duplo clique no arquivo:
   ▶️ **`Iniciar_Impressora.bat`**
4. *(Opcional)* Clique em **`Instalar_Spooler_AutoStart.bat`** para fazer o Spooler ligar sozinho sempre que o computador do caixa for iniciado!

---

## 📄 Notas da Versão v1.1.0 Oficial Global
- **Fix Crítico do WhatsApp Web:** Bypass do bug global da Meta (`getLastMsgKeyForAction`) que derrubou bots pelo mundo desativando as flags corrompidas de *sendSeen*.
- **Sync da Impressora:** Sistema blindado contra *race conditions* garantindo que a impressão sempre tenha o Array de Itens preenchido.
- **Limpeza Profunda:** Remoção total de scripts de Chaos Engineering e testes. Código-fonte 100% puro para a branch principal.

---
*Desenvolvido em altíssima performance para não perder nenhum pedido nas sextas-feiras à noite.* 🥩🔥

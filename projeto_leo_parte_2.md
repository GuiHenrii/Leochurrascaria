# 🚀 PROJETO LÉO CHURRASCARIA - PARTE 2

## 📄 Arquivo: public\style.css
```css
:root {
    --neon-red: #ff3c3c;
    --neon-red-glow: rgba(255, 60, 60, 0.4);
    --neon-red-border: rgba(255, 60, 60, 0.2);
    --bg-dark: #000000;
    --card-bg: rgba(6, 6, 6, 0.85);
    --text-main: #f8fafc;
    --text-muted: #64748b;
    --glass-border: rgba(255, 255, 255, 0.05);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Inter', -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
}

body {
    background: var(--bg-dark);
    color: var(--text-main);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow-x: hidden;
    overflow-y: auto; /* Permite ver a tabela abaixo */
    padding-bottom: 5rem;
}

/* BACKGROUND ULTRA HD */
.background-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: url('bg-4k.png') no-repeat center center fixed;
    background-size: cover;
    z-index: -2;
    filter: brightness(0.4) contrast(1.1);
    animation: zoomBg 40s infinite alternate cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes zoomBg {
    from { transform: scale(1.05); }
    to { transform: scale(1.15); }
}

.smoke-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.9) 100%);
    z-index: -1;
}

.dashboard-container {
    width: 95%;
    max-width: 1400px;
    padding: 3rem;
    z-index: 10;
    position: relative;
}

header {
    text-align: center;
    margin: 4rem 0 3rem 0;
    position: relative;
    animation: fadeInDown 1.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.live-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 0, 0, 0.08);
    border: 1px solid var(--neon-red-border);
    padding: 6px 16px;
    border-radius: 50px;
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 2px;
    color: var(--neon-red);
    text-transform: uppercase;
    margin-bottom: 1.5rem;
}

.live-dot {
    width: 6px;
    height: 6px;
    background: var(--neon-red);
    border-radius: 50%;
    box-shadow: 0 0 10px var(--neon-red);
    animation: pulse 1.5s infinite;
}

@keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.6); opacity: 0.4; }
    100% { transform: scale(1); opacity: 1; }
}

header h1 {
    font-weight: 950;
    font-size: 3.8rem;
    margin-bottom: 0.1rem;
    letter-spacing: -3px;
    text-transform: uppercase;
    color: #fff;
    line-height: 0.95;
    background: linear-gradient(to bottom, #fff 60%, #999 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 10px var(--neon-red-glow));
}

header p {
    color: var(--text-muted);
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 4px;
    text-transform: uppercase;
    margin-top: 10px;
    opacity: 0.7;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    width: 100%;
    animation: fadeInUp 1.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.card {
    position: relative;
    padding: 2rem 1.5rem;
    border-radius: 20px;
    background: linear-gradient(135deg, rgba(15,15,15,0.85) 0%, rgba(5,5,5,1) 100%);
    border: 1px solid var(--glass-border);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    overflow: hidden;
    min-height: 260px;
}

.card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--neon-red), transparent);
    opacity: 0.2;
}

.card:hover {
    transform: translateY(-10px);
    border-color: var(--neon-red-border);
    box-shadow: 0 40px 80px rgba(0,0,0,0.8), 0 0 30px rgba(255, 60, 60, 0.1);
}

.card-icon {
    font-size: 3.5rem;
    filter: drop-shadow(0 0 15px var(--neon-red-glow));
    transition: transform 0.6s ease;
}

.card:hover .card-icon {
    transform: scale(1.1) translateY(-5px);
}

.card-info h3 {
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
}

.card-info h2 {
    font-size: 3.2rem;
    font-weight: 950;
    color: #fff;
    letter-spacing: -2px;
    line-height: 1;
    text-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.tab-controls {
    margin-top: 2rem;
    display: flex;
    justify-content: center;
    gap: 0;
    background: rgba(255,255,255,0.03);
    padding: 6px;
    border-radius: 12px;
    border: 1px solid var(--glass-border);
    width: fit-content;
    margin-left: auto;
    margin-right: auto;
    margin-bottom: 3rem;
}

.tab-controls button {
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 0.8rem 2.2rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.tab-controls button:hover {
    color: #fff;
    background: rgba(255,255,255,0.05);
}

.tab-controls .tab.active {
    background: var(--neon-red);
    color: #fff;
    box-shadow: 0 4px 20px var(--neon-red-glow);
}

/* NAVIGATION TABS (TOP) */
.nav-tabs {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    margin-top: 3rem;
}

.nav-tab {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--glass-border);
    color: var(--text-muted);
    padding: 0.9rem 2rem;
    border-radius: 14px;
    font-size: 0.9rem;
    font-weight: 900;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    text-transform: uppercase;
    letter-spacing: 2px;
}

.nav-tab:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    transform: translateY(-2px);
}

.nav-tab.active {
    background: var(--neon-red);
    color: #fff;
    border-color: var(--neon-red-border);
    box-shadow: 0 10px 30px rgba(255, 60, 60, 0.3);
}

.nav-tab.btn-reset {
    background: rgba(255, 0, 0, 0.05);
    border-color: rgba(255, 0, 0, 0.2);
    color: var(--neon-red);
    font-weight: 800;
}

/* TAB VISIBILITY */
.hidden-tab { display: none !important; }
.active-tab { 
    display: block !important; 
    animation: fadeIn 0.8s ease forwards; 
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
}

/* STOCK MANAGEMENT */
.stock-header {
    margin-top: 4rem;
    padding: 3.5rem;
    border-radius: 24px;
    text-align: center;
    background: rgba(10, 10, 10, 0.5);
    border: 1px solid var(--glass-border);
    margin-bottom: 4rem;
}

.stock-header h2 {
    font-size: 2.2rem;
    color: var(--neon-red);
    margin-bottom: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 3px;
    font-weight: 950;
}

.product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 2.5rem;
    width: 100%;
}

.product-card {
    padding: 2.5rem;
    border-radius: 24px;
    background: linear-gradient(135deg, rgba(20,20,20,0.8) 0%, rgba(5,5,5,0.9) 100%);
    border: 1px solid var(--glass-border);
    display: flex;
    flex-direction: column;
    gap: 2rem;
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    backdrop-filter: blur(40px);
}

.product-card:hover {
    border-color: var(--neon-red-border);
    transform: translateY(-10px);
    box-shadow: 0 40px 80px rgba(0,0,0,0.8);
}

.product-info p {
    font-size: 0.8rem;
    color: var(--neon-red);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 0.5rem;
}

.product-info h4 {
    font-size: 1.4rem;
    color: #fff;
    font-weight: 800;
    line-height: 1.2;
}

.product-price {
    font-size: 1.8rem;
    font-weight: 950;
    color: #fff;
}

.toggle-btn {
    width: 100%;
    padding: 1.2rem;
    border-radius: 15px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05);
    color: #fff;
    font-weight: 900;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.toggle-btn.btn-active {
    background: rgba(74, 222, 128, 0.1);
    color: #4ade80;
    border-color: rgba(74, 222, 128, 0.3);
}

.toggle-btn.btn-active:hover {
    background: #4ade80;
    color: #000;
}

.toggle-btn.btn-inactive {
    background: rgba(255, 60, 60, 0.1);
    color: var(--neon-red);
    border-color: var(--neon-red-border);
}

.toggle-btn.btn-inactive:hover {
    background: var(--neon-red);
    color: #fff;
}

.product-card.out-of-stock {
    opacity: 0.5;
    filter: grayscale(1);
    border-style: dashed;
}

/* ORDERS TABLE SECTION (GRID BASED FOR PRECISION) */
.orders-container {
    margin-top: 4rem;
    padding: 2.5rem;
    border-radius: 24px;
    background: rgba(8, 8, 8, 0.75);
    border: 1px solid var(--glass-border);
    backdrop-filter: blur(50px);
    width: 100%;
}

.table-wrapper {
    margin-top: 2rem;
    background: rgba(255,255,255,0.02);
    border-radius: 16px;
    padding: 1rem;
}

.table-row {
    display: grid;
    grid-template-columns: 60px 160px 1fr 100px 100px 120px;
    gap: 1rem;
    padding: 1.2rem;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}

.table-header {
    border-bottom: 2px solid var(--glass-border);
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 2px;
}

.table-body-row {
    transition: all 0.3s ease;
}

.table-body-row:hover {
    background: rgba(255, 0, 0, 0.05);
    transform: translateX(10px);
}

.cell-id { color: var(--neon-red); font-weight: 800; }
.cell-date { font-size: 0.8rem; opacity: 0.6; }
.cell-items { 
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis; 
    font-size: 0.9rem;
}
.cell-total { font-weight: 800; color: #fff; }
.cell-pay { font-size: 0.8rem; opacity: 0.7; }

@keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-40px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 1200px) {
    .metrics-grid { grid-template-columns: 1fr; gap: 1.5rem; }
    header h1 { font-size: 2.8rem; letter-spacing: -3px; }
    .card-info h2 { font-size: 3.5rem; }
    .dashboard-container { padding: 1.5rem; }
    .tab-controls { flex-wrap: wrap; }
    .orders-container { padding: 1.5rem; margin-top: 3rem; }
    .table-row { grid-template-columns: 50px 120px 1fr 80px; }
    .cell-pay, .cell-date { display: none; }
}
```

---

## 📄 Arquivo: README.md
```md
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

```

---

## 📄 Arquivo: scripts\export_code.js
```js
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const ignoreDirs = ['node_modules', '.git', '.gemini', 'tmp', 'dist', 'build', '.wwebjs_auth', '.wwebjs_cache'];
const ignoreFiles = ['package-lock.json', '.env', 'projeto_completo_para_gpt.md'];

const MAX_LINES = 700;
const MAX_CHARS = 22000;

let currentPart = 1;
let currentOutput = "";
let currentLines = 0;
let currentChars = 0;

function savePart() {
    if (currentOutput.trim() === "" || currentOutput === "# 🚀 PROJETO LÉO CHURRASCARIA - PARTE " + currentPart + "\n\n") return;
    const fileName = `projeto_leo_parte_${currentPart}.md`;
    const filePath = path.join(rootDir, fileName);
    fs.writeFileSync(filePath, currentOutput);
    console.log(`✨ Parte ${currentPart} salva: ${fileName} (${currentLines} linhas, ${currentChars} chars)`);
    currentPart++;
    currentOutput = "# 🚀 PROJETO LÉO CHURRASCARIA - PARTE " + currentPart + "\n\n";
    currentLines = 2;
    currentChars = currentOutput.length;
}

function addToOutput(text) {
    const lines = text.split('\n').length;
    const chars = text.length;

    if (currentLines + lines > MAX_LINES || currentChars + chars > MAX_CHARS) {
        savePart();
    }

    currentOutput += text;
    currentLines += lines;
    currentChars += chars;
}

function processLargeFile(relPath, content, ext) {
    const lines = content.split('\n');
    let chunk = "";
    let chunkLines = 0;
    let chunkSubPart = 1;

    for (let i = 0; i < lines.length; i++) {
        chunk += lines[i] + '\n';
        chunkLines++;

        if (chunkLines >= 600 || chunk.length >= 20000) {
            let fileText = `## 📄 Arquivo: ${relPath} (Parte ${chunkSubPart})\n`;
            fileText += "```" + (ext.substring(1) || 'text') + "\n";
            fileText += chunk + "\n";
            fileText += "```\n\n---\n\n";
            addToOutput(fileText);
            
            chunk = "";
            chunkLines = 0;
            chunkSubPart++;
        }
    }

    if (chunk.trim() !== "") {
        let fileText = `## 📄 Arquivo: ${relPath} (Parte ${chunkSubPart})\n`;
        fileText += "```" + (ext.substring(1) || 'text') + "\n";
        fileText += chunk + "\n";
        fileText += "```\n\n---\n\n";
        addToOutput(fileText);
    }
}

function readDirRecursive(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const relPath = path.relative(rootDir, fullPath);
        
        if (ignoreDirs.some(d => relPath.includes(d))) return;
        if (ignoreFiles.includes(file)) return;
        
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
            readDirRecursive(fullPath);
        } else if (stats.isFile()) {
            const ext = path.extname(file);
            const validExts = ['.js', '.html', '.css', '.sql', '.json', '.md'];
            
            if (validExts.includes(ext) && !file.includes('projeto_leo_parte_')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                
                // Se o arquivo por si só for grande, particiona ele internamente
                if (content.length > 20000 || content.split('\n').length > 600) {
                   processLargeFile(relPath, content, ext);
                } else {
                    let fileText = `## 📄 Arquivo: ${relPath}\n`;
                    fileText += "```" + (ext.substring(1) || 'text') + "\n";
                    fileText += content + "\n";
                    fileText += "```\n\n---\n\n";
                    addToOutput(fileText);
                }
                console.log(`✅ Adicionado: ${relPath}`);
            }
        }
    });
}

console.log("📂 Iniciando exportação fracionada (SUPER RIGOROSA)...");
currentOutput = "# 🚀 PROJETO LÉO CHURRASCARIA - PARTE " + currentPart + "\n\n";
currentLines = 2;
currentChars = currentOutput.length;

readDirRecursive(rootDir);
savePart();

console.log("\n✅ Todas as partes foram geradas rigorosamente dentro dos limites!");

```

---


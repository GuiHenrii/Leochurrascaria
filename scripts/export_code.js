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


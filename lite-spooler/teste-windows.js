const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const printerNames = ['CHURRASQUEIRA', 'COZINHA'];
const tempFile = path.join(__dirname, 'teste_hardware.txt');

fs.writeFileSync(tempFile, "\n\n=== TESTE DE IMPRESSAO WINDOWS ===\n\nSE VOCE ESTA LENDO ISSO,\nO COMANDO PELO WINDOWS ESTA OK!\n\nLÉO CHURRASCARIA\n\n\n\n\n", 'utf8');

console.log("🚀 Iniciando teste de hardware via Windows...");

printerNames.forEach(name => {
    console.log(`📡 Tentando imprimir em: ${name}`);
    const cmd = `powershell -Command "Get-Content -Path '${tempFile}' -Raw | Out-Printer -Name '${name}'"`;
    
    exec(cmd, (error) => {
        if (error) {
            console.error(`❌ Erro em ${name}: Verifique se o nome esta correto no Painel de Controle.`);
            console.error(`Mensagem: ${error.message}`);
        } else {
            console.log(`✅ Comando enviado para ${name}! O papel saiu?`);
        }
    });
});

setTimeout(() => { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); }, 10000);

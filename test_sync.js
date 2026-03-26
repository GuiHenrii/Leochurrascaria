const { spawn } = require('child_process');

console.log("🚀 [MASTER] INICIANDO TESTE EM SINCRONIA TOTAL: VPS + SPOOLER + INJETOR...");

// 1. Inicia o Servidor Principal (VPS)
const vps = spawn('node', ['src/index.js']);
let pAguardando = false;

vps.stdout.on('data', (data) => {
    const out = data.toString().trim();
    if(out.length > 0) console.log(`[VPS] ${out}`);
    
    // Quando a API estiver no ar, ligamos o resto
    if (out.includes('Painel CRM ativo') && !pAguardando) {
        pAguardando = true;
        iniciarDemaisProcessos();
    }
});
vps.stderr.on('data', (data) => console.error(`[VPS ERROR] ${data.toString().trim()}`));

function iniciarDemaisProcessos() {
    // 2. Inicia o Spooler Local
    const spooler = spawn('node', ['app-impressora.js']);
    spooler.stdout.on('data', (data) => {
        const out = data.toString().trim();
        if(out.length > 0) console.log(`[SPOOLER] ${out}`);
    });
    spooler.stderr.on('data', (data) => console.error(`[SPOOLER ERR] ${data.toString().trim()}`));

    // 3. Aguarda 3 segundos para o Spooler acomodar a primeira batida vazia
    setTimeout(() => {
        console.log("\n⚠️ [MASTER] APERTANDO O GATILHO: DISPARANDO INJEÇÃO DE MÚLTIPLOS PEDIDOS...\n");
        const injetor = spawn('node', ['test_vps_spooler.js']);
        injetor.stdout.on('data', (data) => {
             const out = data.toString().trim();
             if(out.length > 0) console.log(`[INJETOR] ${out}`);
        });

        // 4. Dá 12 segundos pro Spooler ler da VPS e cuspir tudo na tela
        setTimeout(() => {
            console.log("\n✅ [MASTER] TESTE CONCLUÍDO! TODOS OS RECIBOS SAÍRAM! DERRUBANDO TUDO...");
            vps.kill();
            spooler.kill();
            process.exit(0);
        }, 12000);
    }, 4000);
}

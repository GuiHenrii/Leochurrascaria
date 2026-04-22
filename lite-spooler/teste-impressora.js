const net = require('net');

const printers = ['192.168.7.201', '192.168.7.202'];
const port = 9100;

console.log("🚀 INICIANDO TESTE DE CONEXAO DIRETA COM AS IMPRESSORAS...");

printers.forEach(ip => {
    console.log(`\n--- Testando Impressora: ${ip} ---`);
    const socket = new net.Socket();

    socket.setTimeout(5000);

    socket.connect(port, ip, () => {
        console.log(`✅ [CONECTADO] Conexao TCP aberta com ${ip}!`);
        
        // Comando ESC/POS basico para imprimir um teste e pular papel
        const testData = Buffer.from([
            0x1B, 0x40, // Inicializa
            0x1B, 0x61, 0x01, // Centraliza
            ...Buffer.from('\n\n=== TESTE DE CONEXAO ===\n'),
            ...Buffer.from('SE VOCE ESTA LENDO ISSO\n'),
            ...Buffer.from('A REDE ESTA FUNCIONANDO!\n'),
            ...Buffer.from('IP: ' + ip + '\n\n\n\n'),
            0x1D, 0x56, 0x42, 0x00 // Corta papel
        ]);

        socket.write(testData, () => {
            console.log(`📡 [ENVIADO] Comando de impressao enviado para ${ip}. O papel saiu?`);
            socket.destroy();
        });
    });

    socket.on('error', (err) => {
        console.log(`❌ [ERRO] Nao foi possivel falar com ${ip}: ${err.message}`);
    });

    socket.on('timeout', () => {
        console.log(`⏰ [TIMEOUT] A impressora ${ip} demorou demais para responder.`);
        socket.destroy();
    });
});

const escpos = require('escpos');
escpos.USB = require('escpos-usb');
escpos.Network = require('escpos-network');
require('dotenv').config();

function getPrinterDevice() {
    try {
        const type = process.env.PRINTER_TYPE || 'network';
        if (type === 'usb') {
            return new escpos.USB();
        } else {
            return new escpos.Network(process.env.PRINTER_HOST || '127.0.0.1', process.env.PRINTER_PORT || 9100);
        }
    } catch (e) {
        return null; // Mock printer se der erro no adapter ou porta
    }
}

async function printOrder(orderId, orderDetails) {
    return new Promise((resolve) => {
        const device = getPrinterDevice();
        if (!device) {
            console.log(`\n========= [PRINTER MOCK] =========\n#COMANDA DO PEDIDO ${orderId}\n${orderDetails}\n==================================\n`);
            return resolve(true);
        }

        try {
            const printer = new escpos.Printer(device);
            device.open(function (error) {
                if (error) {
                    // Fallback to screen mock if offline
                    console.log(`\n========= [PRINTER MOCK - OFFLINE] =========\n#COMANDA DO PEDIDO ${orderId}\n${orderDetails}\n============================================\n`);
                    return resolve(false);
                }

                printer
                    .font('a')
                    .align('ct')
                    .style('b')
                    .size(2, 2)
                    .text('CHURRASCARIA DO LEO')
                    .text('PEDIDO: #' + orderId)
                    .size(1, 1)
                    .text('--------------------------------')
                    .align('lt')
                    .text(orderDetails)
                    .text('--------------------------------')
                    .align('ct')
                    .text(new Date().toLocaleString())
                    .cut()
                    .close();
                
                resolve(true);
            });
        } catch(e) {
            console.log(`\n========= [PRINTER MOCK - FALLBACK] =========\n#COMANDA DO PEDIDO ${orderId}\n${orderDetails}\n=============================================\n`);
            resolve(false);
        }
    });
}

module.exports = { printOrder };


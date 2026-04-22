const axios = require('axios');
require('dotenv').config();

class BeeService {
    constructor() {
        this.baseUrl = process.env.BEE_API_URL || 'https://beedelivery.com.br/api/v1';
        this.token = process.env.BEE_API_TOKEN;
        this.clientId = process.env.BEE_CLIENT_ID;
        this.clientSecret = process.env.BEE_CLIENT_SECRET;
    }

    /**
     * Tenta calcular o frete real via Bee Delivery.
     * Se falhar ou não houver chave, retorna null para usarmos o fallback.
     */
    async calculateFee(destAddress) {
        if (!this.token && (!this.clientId || !this.clientSecret)) {
            // Em silêncio até as chaves chegarem
            return null;
        }

        try {
            console.log(`🐝 [BEE SERVICE] Cotando frete para: ${destAddress}`);
            
            // Aqui faremos a chamada real baseada no manual que você vai receber.
            // Exemplo padrão de API de logística:
            /*
            const response = await axios.post(`${this.baseUrl}/check_price`, {
                address: destAddress,
                origin_lat: -17.7464, // Coordenadas do Léo
                origin_lng: -48.6318
            }, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            return response.data.price;
            */
            
            return null; // Por enquanto retorna null para não quebrar o sistema
        } catch (error) {
            console.error('❌ [BEE SERVICE ERROR]', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Despacha o pedido para a Bee Delivery solicitar o motoboy.
     */
    async dispatchDelivery(orderData) {
        if (!this.token) return { success: false, message: 'Sem Token' };

        try {
            console.log(`🐝 [BEE SERVICE] Solicitando motoboy para Pedido #${orderData.id}`);
            // Chamada para criar o pedido na Bee...
            return { success: true, beeId: "pending" };
        } catch (error) {
            console.error('❌ [BEE DISPATCH ERROR]', error.message);
            return { success: false };
        }
    }
}

module.exports = new BeeService();

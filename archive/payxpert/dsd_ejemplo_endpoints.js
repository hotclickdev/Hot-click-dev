// ============================================================
// EJEMPLO DE ENDPOINTS PARA PAYXPERT
// ============================================================

const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Configuración de PayXpert
const PAYXPERT_CONFIG = {
    apiUrl: process.env.PAYXPERT_API_URL || 'https://api.payxpert.com/v1',
    apiKey: process.env.PAYXPERT_API_KEY,
    apiSecret: process.env.PAYXPERT_API_SECRET,
    webhookSecret: process.env.PAYXPERT_WEBHOOK_SECRET
};

// 1. Crear un pago (endpoint que el frontend llama)
router.post('/create-payment', async (req, res) => {
    const { id_pedido, id_usuario, metodo_pago, redirect_url } = req.body;
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Obtener datos del pedido
        const pedidoResult = await client.query(`
            SELECT total_pedido, numero_pedido 
            FROM HOT_CLICK_PEDIDO_TB 
            WHERE id_pedido = $1 AND fk_id_estado = 1
        `, [id_pedido]);
        
        if (pedidoResult.rows.length === 0) {
            throw new Error('Pedido no encontrado');
        }
        
        const pedido = pedidoResult.rows[0];
        
        // Crear registro de pago
        const pagoResult = await client.query(`
            SELECT * FROM fn_crear_pago($1, $2, $3, 'CRC', $4, $5)
        `, [id_pedido, id_usuario, pedido.total_pedido, metodo_pago, redirect_url]);
        
        const pago = pagoResult.rows[0];
        
        // Llamar a API de PayXpert
        const payxpertResponse = await axios.post(
            `${PAYXPERT_CONFIG.apiUrl}/payments`,
            {
                amount: pago.monto,
                currency: pago.moneda,
                merchantTransactionId: pago.merchant_token,
                redirectUrl: `${process.env.BASE_URL}/api/payments/redirect/${pago.merchant_token}`,
                webhookUrl: `${process.env.BASE_URL}/api/payments/webhook`,
                paymentMethod: metodo_pago === 'PAYXPERT_APPLE_PAY' ? 'APPLE_PAY' : 'CARD'
            },
            {
                headers: {
                    'Authorization': `Bearer ${PAYXPERT_CONFIG.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        // Registrar log
        await client.query(`
            SELECT fn_registrar_log_pago($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            'CREATE_PAYMENT',
            `${PAYXPERT_CONFIG.apiUrl}/payments`,
            'POST',
            JSON.stringify(payxpertResponse.config.data),
            payxpertResponse.status,
            JSON.stringify(payxpertResponse.data),
            null,
            true,
            pago.id_pago,
            id_usuario
        ]);
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            paymentId: pago.id_pago,
            merchantToken: pago.merchant_token,
            checkoutUrl: payxpertResponse.data.checkoutUrl,
            redirectUrl: payxpertResponse.data.redirectUrl
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        
        // Registrar error
        await client.query(`
            SELECT fn_registrar_log_pago($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            'CREATE_PAYMENT_ERROR',
            req.url,
            req.method,
            JSON.stringify(req.body),
            error.response?.status || 500,
            JSON.stringify(error.response?.data || { message: error.message }),
            null,
            false,
            null,
            id_usuario
        ]);
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

// 2. Webhook de PayXpert (recibe notificaciones)
router.post('/webhook', async (req, res) => {
    const signature = req.headers['x-payxpert-signature'];
    const payload = req.body;
    
    // Verificar firma (seguridad)
    const expectedSignature = crypto
        .createHmac('sha256', PAYXPERT_CONFIG.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    if (signature !== expectedSignature) {
        console.error('Firma inválida en webhook');
        return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const client = await pool.connect();
    
    try {
        const { merchantTransactionId, status, transactionId, errorCode, errorMessage, card } = payload;
        
        // Registrar webhook recibido
        const webhookResult = await client.query(`
            SELECT fn_registrar_webhook($1, $2, $3, $4) as id
        `, [merchantTransactionId, `payment.${status}`, payload, req.ip]);
        
        const webhookId = webhookResult.rows[0].id;
        
        // Procesar webhook
        const processResult = await client.query(`
            SELECT * FROM fn_procesar_webhook_pago($1)
        `, [webhookId]);
        
        res.json({
            success: true,
            processed: processResult.rows[0].procesado,
            message: processResult.rows[0].mensaje
        });
        
    } catch (error) {
        console.error('Error procesando webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// 3. Consultar estado de pago (para el frontend)
router.get('/payment-status/:merchantToken', async (req, res) => {
    const { merchantToken } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT * FROM fn_obtener_pago_por_token($1)
        `, [merchantToken]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Pago no encontrado'
            });
        }
        
        const pago = result.rows[0];
        
        res.json({
            success: true,
            payment: {
                id: pago.id_pago,
                estado: pago.estado_pago,
                monto: pago.monto,
                moneda: pago.moneda,
                metodo: pago.metodo_pago_tipo,
                fecha_creacion: pago.fecha_creacion,
                fecha_expiracion: pago.fecha_expiracion,
                pedido: {
                    id: pago.id_pedido,
                    numero: pago.numero_pedido,
                    total: pago.total_pedido
                },
                cliente: {
                    nombre: pago.nombre_usuario,
                    correo: pago.correo_usuario
                }
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 4. Redirección después del pago
router.get('/redirect/:merchantToken', async (req, res) => {
    const { merchantToken } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT estado_pago, redirect_url, fk_id_pedido 
            FROM hot_click_pago_tb 
            WHERE merchant_token = $1
        `, [merchantToken]);
        
        if (result.rows.length === 0) {
            return res.status(404).send('Pago no encontrado');
        }
        
        const pago = result.rows[0];
        const estado = pago.estado_pago;
        const redirectUrl = pago.redirect_url || `${process.env.FRONTEND_URL}/payment-result`;
        
        // Redirigir con el estado del pago
        const url = new URL(redirectUrl);
        url.searchParams.set('status', estado);
        url.searchParams.set('order_id', pago.fk_id_pedido);
        
        res.redirect(url.toString());
        
    } catch (error) {
        res.status(500).send('Error procesando redirección');
    }
});

module.exports = router;
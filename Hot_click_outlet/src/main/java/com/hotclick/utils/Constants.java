package com.hotclick.utils;

import java.time.ZoneId;

public class Constants {

    // Timezone oficial de Costa Rica (UTC−6, sin cambio de horario)
    public static final ZoneId ZONA_CR = ZoneId.of("America/Costa_Rica");

    /**
     * Genera un número de pedido único con el prefijo dado.
     * Usa UUID aleatorio (12 hex chars = 48 bits) para evitar colisiones
     * bajo carga concurrente. System.currentTimeMillis() colisionaba cuando
     * dos requests llegaban en el mismo milisegundo → ConstraintViolationException.
     */
    public static String generarNumeroPedido(String prefijo) {
        return prefijo + java.util.UUID.randomUUID().toString()
                .replace("-", "").substring(0, 12).toUpperCase();
    }


    // Estados
    public static final int ESTADO_ACTIVO     = 1;
    public static final int ESTADO_INACTIVO   = 2;
    public static final int ESTADO_ELIMINADO  = 3;
    public static final int ESTADO_SUSPENDIDO = 4;
    public static final int ESTADO_PENDIENTE  = 5; // correo sin verificar

    // OTP
    public static final String OTP_TIPO_REGISTRO       = "REGISTRO";
    public static final String OTP_TIPO_RESET_PASSWORD = "RESET_PASSWORD";
    public static final int    OTP_MAX_INTENTOS        = 5;
    public static final int    OTP_MAX_REENVIOS        = 3;
    public static final int    OTP_VENTANA_REENVIO_MIN = 10;

    // Roles
    public static final String ROL_ADMIN        = "ADMIN";
    public static final String ROL_EMPRENDEDOR  = "EMPRENDEDOR";
    public static final String ROL_USUARIO_FINAL = "USUARIO_FINAL";

    // Estados de pedido
    public static final String PEDIDO_PENDIENTE = "PENDIENTE";
    public static final String PEDIDO_CONFIRMADO = "CONFIRMADO";
    public static final String PEDIDO_PREPARANDO = "PREPARANDO";
    public static final String PEDIDO_ENVIADO = "ENVIADO";
    public static final String PEDIDO_ENTREGADO = "ENTREGADO";
    public static final String PEDIDO_CANCELADO  = "CANCELADO";
    public static final String PEDIDO_COMPLETADO = "COMPLETADO";

    // Estados de carrito
    public static final String CARRITO_ACTIVO = "ACTIVO";
    public static final String CARRITO_ABANDONADO = "ABANDONADO";
    public static final String CARRITO_CONVERTIDO = "CONVERTIDO";

    // Estados de pago
    public static final String PAGO_PENDIENTE    = "PENDIENTE";
    public static final String PAGO_CAPTURADO    = "CAPTURADO";
    public static final String PAGO_FALLIDO      = "FALLIDO";
    public static final String PAGO_CANCELADO    = "CANCELADO";
    public static final String PAGO_REEMBOLSADO  = "REEMBOLSADO";

    // Estados de pedido extendidos
    public static final String PEDIDO_PAGADO        = "PAGADO";
    public static final String PEDIDO_EN_PREPARACION = "EN_PREPARACION";
    public static final String PEDIDO_LISTO_RETIRO   = "LISTO_RETIRO";

    // Métodos de envío
    public static final String ENVIO_DOMICILIO = "ENVIO_A_DOMICILIO";
    public static final String ENVIO_RETIRO    = "RETIRO_EN_TIENDA";

    // Proveedores de pago
    public static final String PROVEEDOR_STRIPE = "STRIPE";
    public static final String PROVEEDOR_SINPE  = "SINPE";
    public static final String PROVEEDOR_ONVO   = "ONVO";

    // Estados de pedido SINPE
    public static final String PEDIDO_PENDIENTE_COMPROBANTE = "PENDIENTE_COMPROBANTE";
    public static final String PEDIDO_PENDIENTE_APROBACION  = "PENDIENTE_APROBACION";

    // Estados de comprobante SINPE
    public static final String COMPROBANTE_PENDIENTE  = "PENDIENTE";
    public static final String COMPROBANTE_APROBADO   = "APROBADO";
    public static final String COMPROBANTE_RECHAZADO  = "RECHAZADO";

    // Acciones de auditoría admin
    public static final String AUDITORIA_APROBAR_SINPE      = "APROBAR_SINPE";
    public static final String AUDITORIA_RECHAZAR_SINPE     = "RECHAZAR_SINPE";
    public static final String AUDITORIA_AUTO_APROBAR_SINPE = "AUTO_APROBAR_SINPE";

    // 2FA — métodos disponibles
    public static final String METODO_2FA_TOTP      = "TOTP";
    public static final String METODO_2FA_EMAIL_OTP = "EMAIL_OTP";

    // 2FA — OTP type para login por email
    public static final String OTP_TIPO_2FA_LOGIN = "2FA_LOGIN";

    // 2FA — ventana de replay protection TOTP (±1 periodo = 3 × 30s = 90s)
    public static final long TOTP_REPLAY_WINDOW_SECONDS = 90L;

    /** Cliente genérico de ventas de mostrador (POS sin cliente elegido). */
    public static final Long ID_USUARIO_MOSTRADOR = 999L;
}

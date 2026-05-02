package com.hotclick.utils;

public class Constants {

    // Estados
    public static final int ESTADO_PENDIENTE  = 0; // pendiente de aprobación por admin
    public static final int ESTADO_ACTIVO     = 1;
    public static final int ESTADO_INACTIVO   = 2;
    public static final int ESTADO_ELIMINADO  = 3;
    public static final int ESTADO_SUSPENDIDO = 4;

    // Roles
    public static final String ROL_ADMIN_IT = "ADMIN_IT";
    public static final String ROL_ADMIN_CLIENTE = "ADMIN_CLIENTE";
    public static final String ROL_USUARIO_FINAL = "USUARIO_FINAL";

    // Estados de pedido
    public static final String PEDIDO_PENDIENTE = "PENDIENTE";
    public static final String PEDIDO_CONFIRMADO = "CONFIRMADO";
    public static final String PEDIDO_PREPARANDO = "PREPARANDO";
    public static final String PEDIDO_ENVIADO = "ENVIADO";
    public static final String PEDIDO_ENTREGADO = "ENTREGADO";
    public static final String PEDIDO_CANCELADO = "CANCELADO";

    // Estados de carrito
    public static final String CARRITO_ACTIVO = "ACTIVO";
    public static final String CARRITO_ABANDONADO = "ABANDONADO";
    public static final String CARRITO_CONVERTIDO = "CONVERTIDO";
}

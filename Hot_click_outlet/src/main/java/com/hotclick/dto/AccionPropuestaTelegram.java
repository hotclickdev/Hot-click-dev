package com.hotclick.dto;

import java.util.Map;

/**
 * Acción de mutación que el chat de IA de Telegram propuso durante el loop de
 * tool-calling (AiCopilotService.ejecutarTool), pendiente de confirmación del
 * usuario. Nunca se ejecuta ni se persiste directamente — TelegramFlujoService
 * la pliega en TelegramFlujoEstado (contexto JSON) para mostrarla con botones
 * Confirmar/Cancelar, y solo la ejecuta si el usuario confirma.
 */
public record AccionPropuestaTelegram(String tipo, Long entidadId, Map<String, Object> params, String resumen) {

    public static final String PEDIDO_ESTADO    = "PEDIDO_ESTADO";
    public static final String PEDIDO_GUIA      = "PEDIDO_GUIA";
    public static final String STOCK_AJUSTE     = "STOCK_AJUSTE";
    public static final String PRODUCTO_OFERTA  = "PRODUCTO_OFERTA";
}

package com.hotclick.service.whatsapp;

/**
 * 15 estructuras base (5 escenarios × 3 variantes de tono).
 * Gemini toma el prompt de cada variante y genera el texto final personalizado.
 * Resultado: cada cliente recibe un mensaje diferente según su contexto y segmento.
 */
public enum WaPlantilla {

    // ── 1. CONFIRMACIÓN DE PEDIDO ─────────────────────────────────────────────

    CONFIRMACION_CALIDO(WaPlantillaConfirmacion.ESCENARIO, WaPlantillaConfirmacion.CALIDO),
    CONFIRMACION_PROFESIONAL(WaPlantillaConfirmacion.ESCENARIO, WaPlantillaConfirmacion.PROFESIONAL),
    CONFIRMACION_ENERGICO(WaPlantillaConfirmacion.ESCENARIO, WaPlantillaConfirmacion.ENERGICO),

    // ── 2. GUÍA ASIGNADA / PEDIDO EN CAMINO ──────────────────────────────────

    GUIA_INFORMATIVO(WaPlantillaGuia.ESCENARIO, WaPlantillaGuia.INFORMATIVO),
    GUIA_TRANQUILIZADOR(WaPlantillaGuia.ESCENARIO, WaPlantillaGuia.TRANQUILIZADOR),
    GUIA_BREVE(WaPlantillaGuia.ESCENARIO, WaPlantillaGuia.BREVE),

    // ── 3. POST-ENTREGA — SOLICITUD DE RESEÑA ────────────────────────────────

    RESENA_AGRADECIDO(WaPlantillaResena.ESCENARIO, WaPlantillaResena.AGRADECIDO),
    RESENA_CASUAL(WaPlantillaResena.ESCENARIO, WaPlantillaResena.CASUAL),
    RESENA_PUNTOS(WaPlantillaResena.ESCENARIO, WaPlantillaResena.PUNTOS),

    // ── 4. CARRITO ABANDONADO ─────────────────────────────────────────────────

    CARRITO_CURIOSO(WaPlantillaCarrito.ESCENARIO, WaPlantillaCarrito.CURIOSO),
    CARRITO_URGENCIA(WaPlantillaCarrito.ESCENARIO, WaPlantillaCarrito.URGENCIA),
    CARRITO_RECORDATORIO(WaPlantillaCarrito.ESCENARIO, WaPlantillaCarrito.RECORDATORIO),

    // ── 5. NUEVO PEDIDO — EMPRENDEDOR ────────────────────────────────────────

    EMPRENDEDOR_ALERTA(WaPlantillaEmprendedor.ESCENARIO, WaPlantillaEmprendedor.ALERTA),
    EMPRENDEDOR_BREVE(WaPlantillaEmprendedor.ESCENARIO, WaPlantillaEmprendedor.BREVE),

    // ── 6. NUEVO PEDIDO — ADMIN IT ───────────────────────────────────────────

    ADMIN_ALERTA(WaPlantillaAdmin.ESCENARIO, WaPlantillaAdmin.ALERTA),

    // ── 7. REACTIVACIÓN (cliente inactivo 45+ días) ───────────────────────────

    REACTIVACION_EXTRAÑAMOS(WaPlantillaReactivacion.ESCENARIO, WaPlantillaReactivacion.EXTRAÑAMOS),
    REACTIVACION_NOVEDAD(WaPlantillaReactivacion.ESCENARIO, WaPlantillaReactivacion.NOVEDAD),
    REACTIVACION_OFERTA(WaPlantillaReactivacion.ESCENARIO, WaPlantillaReactivacion.OFERTA);

    public final String escenario;
    public final String promptTemplate;

    WaPlantilla(String escenario, String promptTemplate) {
        this.escenario = escenario;
        this.promptTemplate = promptTemplate;
    }

    /** Devuelve una variante aleatoria del escenario dado. */
    public static WaPlantilla varianteAleatoria(String escenario) {
        WaPlantilla[] variantes = java.util.Arrays.stream(values())
            .filter(p -> p.escenario.equals(escenario))
            .toArray(WaPlantilla[]::new);
        if (variantes.length == 0) return CONFIRMACION_CALIDO;
        return variantes[(int) (Math.random() * variantes.length)];
    }
}

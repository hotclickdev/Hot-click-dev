package com.hotclick.service.email;

import com.hotclick.utils.Constants;

/**
 * Texto del método de envío para los correos (Figma `30:1599`: «Envío normal GAM»).
 * Retiro = RETIRO_EN_TIENDA (tienda), RETIRO/EN_TIENDA (POS y autoservicio) o sin método.
 */
final class MetodoEnvioTexto {

    private MetodoEnvioTexto() {}

    static boolean esRetiro(String metodoEnvio) {
        return metodoEnvio == null || metodoEnvio.isBlank()
            || Constants.ENVIO_RETIRO.equals(metodoEnvio)
            || "RETIRO".equals(metodoEnvio) || "EN_TIENDA".equals(metodoEnvio);
    }

    static String etiqueta(String metodoEnvio) {
        if (esRetiro(metodoEnvio)) return "Retiro en tienda";
        return switch (metodoEnvio) {
            case "ENVIO_RAPIDO"           -> "Envío rápido";
            case "ENVIO_NORMAL_GAM"       -> "Envío normal GAM";
            case "ENVIO_NORMAL_FUERA_GAM" -> "Envío normal fuera del GAM";
            default                       -> "Envío a domicilio";
        };
    }
}

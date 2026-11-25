package com.hotclick.agente.pago;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.service.whatsapp.PlantillaMeta;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Aviso fuera de la ventana de 24 h con plantillas aprobadas de Meta ({@link PlantillaMeta}), enviado por la cuenta de
 * canal de la conversación. Solo WhatsApp tiene plantillas: en Instagram o Messenger, y en los tipos sin plantilla
 * (pago rechazado, recordatorio 2), devuelve false y el aviso queda pendiente. Nunca loguea destinatario ni variables.
 */
@Component
public class AvisoFueraDeVentanaPlantillas implements AvisoFueraDeVentana {

    private static final Logger log = LoggerFactory.getLogger(AvisoFueraDeVentanaPlantillas.class);
    private static final String SIMBOLO_COLON = "₡";
    private static final String NOMBRE_POR_DEFECTO = "cliente";
    private static final String PRODUCTOS_POR_DEFECTO = "tus productos";

    private final CanalMensajeria canal;

    public AvisoFueraDeVentanaPlantillas(CanalMensajeria canal) {
        this.canal = canal;
    }

    /** Plantilla del tipo de aviso, si existe (solo pago confirmado, traspaso y compra pendiente). */
    static Optional<PlantillaMeta> plantillaDe(Tipo tipo) {
        if (tipo == null) return Optional.empty();
        return switch (tipo) {
            case PAGO_CONFIRMADO -> Optional.of(PlantillaMeta.PAGO_CONFIRMADO);
            case TRASPASO_ASESOR -> Optional.of(PlantillaMeta.TRASPASO_ASESOR);
            case RECORDATORIO_1 -> Optional.of(PlantillaMeta.RECORDATORIO_COMPRA_PENDIENTE);
            case PAGO_RECHAZADO, RECORDATORIO_2 -> Optional.empty();
        };
    }

    @Override
    public boolean enviar(CanalCuenta cuenta, String destinatario, Tipo tipo, Map<String, String> variables) {
        if (cuenta == null || destinatario == null || destinatario.isBlank()) return false;
        if (cuenta.getTipo() != MensajeEntrante.Canal.WHATSAPP) return false;
        Optional<PlantillaMeta> plantilla = plantillaDe(tipo);
        if (plantilla.isEmpty()) return false;
        try {
            List<String> params = plantilla.get().parametros(contexto(variables));
            canal.enviarPlantilla(cuenta, destinatario, plantilla.get(), params);
            return true;
        } catch (RuntimeException ex) {
            log.warn("[agente-pago] no se pudo enviar la plantilla del aviso {}: {}", tipo, ex.getClass().getSimpleName());
            return false;
        }
    }

    /** Traduce las variables del aviso a las claves de {@link PlantillaMeta} (nombre, numeroPedido, total, productos). */
    static Map<String, String> contexto(Map<String, String> variables) {
        Map<String, String> v = variables == null ? Map.of() : variables;
        Map<String, String> ctx = new HashMap<>(v);
        ctx.put("nombre", vacioA(v.get("nombre"), NOMBRE_POR_DEFECTO));
        if (!ctx.containsKey("numeroPedido") && v.get("pedido") != null) ctx.put("numeroPedido", v.get("pedido"));
        String total = v.get("total");
        if (total != null) ctx.put("total", total.strip().replace(SIMBOLO_COLON, "").strip());
        ctx.put("productos", vacioA(v.get("productos"), PRODUCTOS_POR_DEFECTO));
        return ctx;
    }

    private static String vacioA(String valor, String porDefecto) {
        return valor == null || valor.isBlank() ? porDefecto : valor;
    }
}

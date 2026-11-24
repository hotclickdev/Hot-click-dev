package com.hotclick.agente.pago;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ConversacionSesion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;

/**
 * Salida de un aviso del bot por la conversación del enlace. Dentro de la ventana de 24 h manda texto libre y lo
 * guarda en la conversación; fuera, nunca texto libre: pasa por {@link AvisoFueraDeVentana} y, si no hay plantilla,
 * el resultado es PENDIENTE para que quien llama lo anote. Sin transacción abierta. Nunca loguea contacto ni texto.
 */
@Component
public class EnvioConversacion {

    private static final Logger log = LoggerFactory.getLogger(EnvioConversacion.class);

    public enum Resultado { ENVIADO, PLANTILLA, PENDIENTE }

    private final CanalMensajeria canal;
    private final ConversacionService conversaciones;
    private final ObjectProvider<AvisoFueraDeVentana> fueraDeVentana;

    public EnvioConversacion(CanalMensajeria canal, ConversacionService conversaciones,
                             ObjectProvider<AvisoFueraDeVentana> fueraDeVentana) {
        this.canal = canal;
        this.conversaciones = conversaciones;
        this.fueraDeVentana = fueraDeVentana;
    }

    public static boolean dentroDeVentana(ConversacionSesion s, Instant ahora) {
        Instant ultimo = s.getUltimoMensajeCliente();
        return ultimo != null && !ahora.isAfter(ultimo.plus(ConversacionActiva.VENTANA));
    }

    public Resultado enviar(ConversacionSesion sesion, CanalCuenta cuenta, AvisoFueraDeVentana.Tipo tipo,
                            String texto, Map<String, String> variables, Instant ahora) {
        if (sesion == null || cuenta == null || sesion.getContactoExterno() == null) return Resultado.PENDIENTE;
        try {
            if (!dentroDeVentana(sesion, ahora)) {
                AvisoFueraDeVentana plantillas = fueraDeVentana.getIfAvailable(() -> AvisoFueraDeVentana.NINGUNO);
                boolean enviado = plantillas.enviar(cuenta, sesion.getContactoExterno(), tipo, variables);
                return enviado ? Resultado.PLANTILLA : Resultado.PENDIENTE;
            }
            canal.enviarTexto(cuenta, sesion.getContactoExterno(), texto);
        } catch (RuntimeException ex) {
            log.warn("[agente-pago] no se pudo enviar el aviso {}: {}", tipo, ex.getClass().getSimpleName());
            return Resultado.PENDIENTE;
        }
        try {
            conversaciones.registrarSalienteBot(sesion.getId(), sesion.getEmpresaId(), texto);
        } catch (RuntimeException ex) {
            log.warn("[agente-pago] aviso enviado pero no quedó en el historial: {}", ex.getClass().getSimpleName());
        }
        return Resultado.ENVIADO;
    }
}

package com.hotclick.agente.panel;

import com.hotclick.agente.motor.TonoAgente;

import java.util.List;

/**
 * Configuración del bot de un negocio (AG-19). {@code trato} es USTED o TUTEO (de cara al cliente nunca voseo).
 * La zona horaria siempre es America/Costa_Rica; se devuelve para que el panel la muestre.
 */
public record AgenteConfigDto(String nombreBot, String trato, boolean emojis, boolean activo, boolean horarioActivo,
                              List<HorarioAtencion.Dia> horario, String mensajeFueraHorario, String zona) {

    public static final String ZONA = "America/Costa_Rica";

    public AgenteConfigDto {
        horario = horario == null ? List.of() : List.copyOf(horario);
        zona = ZONA;
    }

    /** Tono para el motor. */
    public TonoAgente tono() {
        return new TonoAgente(nombreBot, "TUTEO".equals(trato) ? TonoAgente.Trato.TUTEO : TonoAgente.Trato.USTED, emojis);
    }

    /** Cuerpo del PUT: mismos campos, sin la zona. */
    public record Pedido(String nombreBot, String trato, Boolean emojis, Boolean activo, Boolean horarioActivo,
                         List<HorarioAtencion.Dia> horario, String mensajeFueraHorario) {}
}

package com.hotclick.agente.bandeja;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Vistas públicas de la bandeja. Nunca llevan token, id de cuenta de Meta ni el contacto completo. */
public final class BandejaDtos {

    private BandejaDtos() {}

    /** contacto: enmascarado, solo los últimos 4 caracteres. */
    public record Conversacion(
            UUID id,
            String canal,
            String contacto,
            String modo,
            String estado,
            Long asignadoAId,
            boolean asignadaAMi,
            String ultimoMensaje,
            Instant ultimoMensajeEn,
            boolean ventanaAbierta,
            Instant ventanaVenceEn,
            boolean cupoAgotado) {}

    public record Pagina(List<Conversacion> items, int pagina, int tamano, long total, boolean hayMas) {}

    public record Mensaje(Long id, String rol, String texto, Instant fecha) {}

    public record Detalle(Conversacion conversacion, List<Mensaje> mensajes) {}

    public record Resumen(long asignadasAMi, long sinAsignar) {}

    public record Miembro(Long id, String nombre) {}

    public record PedidoResponder(String texto) {}

    public record PedidoAsignar(Long usuarioId) {}
}

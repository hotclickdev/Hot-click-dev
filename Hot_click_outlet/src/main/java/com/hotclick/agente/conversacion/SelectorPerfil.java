package com.hotclick.agente.conversacion;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.conversacion.spi.TelefonoVinculadoResolver;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import java.util.OptionalLong;

/**
 * Elige el perfil del bot: cuenta sin empresa → HOTCLICK; con empresa → NEGOCIO_VENTAS, salvo que el remitente sea
 * un teléfono vinculado a un usuario de esa empresa → NEGOCIO_INTERNO. Solo WhatsApp puede ser interno (el wa_id
 * es el teléfono verificado por Meta).
 */
@Component
public class SelectorPerfil {

    public record Eleccion(PerfilConversacion perfil, Long usuarioId) {}

    private final ObjectProvider<TelefonoVinculadoResolver> resolver;

    public SelectorPerfil(ObjectProvider<TelefonoVinculadoResolver> resolver) {
        this.resolver = resolver;
    }

    public Eleccion elegir(CanalCuenta cuenta, String remitenteId) {
        if (cuenta.getEmpresaId() == null) return new Eleccion(PerfilConversacion.HOTCLICK, null);
        if (cuenta.getTipo() == com.hotclick.agente.webhook.MensajeEntrante.Canal.WHATSAPP) {
            TelefonoVinculadoResolver r = resolver.getIfAvailable();
            if (r != null) {
                OptionalLong u = r.usuarioVinculado(cuenta.getEmpresaId(), remitenteId);
                if (u.isPresent()) return new Eleccion(PerfilConversacion.NEGOCIO_INTERNO, u.getAsLong());
            }
        }
        return new Eleccion(PerfilConversacion.NEGOCIO_VENTAS, null);
    }
}

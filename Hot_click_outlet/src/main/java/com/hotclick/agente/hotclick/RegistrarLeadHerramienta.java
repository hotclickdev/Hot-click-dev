package com.hotclick.agente.hotclick;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.agente.lead.LeadService;
import com.hotclick.agente.lead.TipoLead;
import com.hotclick.agente.motor.AccionAgente;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.HerramientaAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.service.whatsapp.WhatsAppHelpers;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * {@code registrar_lead}: una persona interesada en comprarle a un negocio. El contacto y el canal salen del contexto;
 * la tienda se identifica con el slug que devolvió {@code buscar_productos} y se valida contra la regla de visibilidad
 * (tienda aprobada y pública). Si el contexto ya trae empresa, se usa esa y el input se ignora.
 */
@Component
public class RegistrarLeadHerramienta implements HerramientaAgente {

    private final LeadService leads;

    public RegistrarLeadHerramienta(LeadService leads) {
        this.leads = leads;
    }

    @Override public String nombre() { return "registrar_lead"; }

    @Override
    public String descripcion() {
        return "Registra el interés de la persona en comprarle a un negocio, para que el negocio la contacte. "
            + "Úsela cuando la persona pida que la contacten o quiera seguir con un negocio. "
            + "La tienda es el valor 'tienda' que devolvió buscar_productos.";
    }

    @Override
    public Map<String, Object> inputSchema() {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("tienda", EsquemasHotClick.texto("Identificador de la tienda tal como lo devolvió buscar_productos"));
        props.put("interes", EsquemasHotClick.texto("Qué busca o quiere comprar, en pocas palabras"));
        props.put("nombre", EsquemasHotClick.texto("Nombre de la persona, si lo dio; vacío si no"));
        return EsquemasHotClick.objeto(props, List.of("tienda", "interes"));
    }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        String interes = input == null ? "" : input.path("interes").asText("").trim();
        if (interes.isEmpty()) return ResultadoHerramienta.error("Falta qué le interesa a la persona.");
        String contacto = ContactoLead.de(contexto);
        if (contacto == null) return ResultadoHerramienta.error("No hay contacto para registrar; derive a una persona.");

        Long empresaId = contexto.empresaId();
        if (empresaId == null) {
            Optional<Long> tienda = leads.empresaPublicaPorSlug(input.path("tienda").asText(""));
            if (tienda.isEmpty()) {
                return ResultadoHerramienta.error("Tienda no válida: use el valor 'tienda' de buscar_productos.");
            }
            empresaId = tienda.get();
        }
        leads.registrar(TipoLead.COMPRADOR, empresaId, contacto, ContactoLead.canal(contexto), contexto.sesionId(),
            input.path("nombre").asText(null), null, interes);
        return ResultadoHerramienta.conAccion(
            "Listo: el negocio recibió su interés y lo contactará por este mismo chat.",
            new AccionAgente(AccionAgente.Tipo.LEAD_REGISTRADO, TipoLead.COMPRADOR.name()));
    }

    /** Contacto del canal tal como llega al bot (WhatsApp: teléfono normalizado). */
    static final class ContactoLead {
        private ContactoLead() {}

        static String de(ContextoHerramienta c) {
            String raw = c.contactoExterno();
            if (raw == null || raw.isBlank()) return null;
            return c.canal() == MensajeEntrante.Canal.WHATSAPP ? WhatsAppHelpers.normalizarTelefono(raw) : raw.strip();
        }

        static String canal(ContextoHerramienta c) {
            return c.canal() == null ? null : c.canal().name();
        }
    }
}

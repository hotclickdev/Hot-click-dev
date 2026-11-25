package com.hotclick.agente.hotclick;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.agente.lead.LeadService;
import com.hotclick.agente.lead.TipoLead;
import com.hotclick.agente.motor.AccionAgente;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.HerramientaAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * {@code registrar_lead_negocio}: un negocio interesado en vender en HotClick. Queda como lead de HotClick
 * (empresa null, lo ve el ADMIN) y la respuesta trae el enlace de registro de vendedores.
 */
@Component
public class RegistrarLeadNegocioHerramienta implements HerramientaAgente {

    /** Ruta del SPA donde un negocio se registra como vendedor. */
    static final String RUTA_REGISTRO = "/registro-empresa";

    private final LeadService leads;
    private final String appUrl;

    public RegistrarLeadNegocioHerramienta(LeadService leads, @Value("${app.url:https://hotclick.lat}") String appUrl) {
        this.leads = leads;
        this.appUrl = appUrl.endsWith("/") ? appUrl.substring(0, appUrl.length() - 1) : appUrl;
    }

    @Override public String nombre() { return "registrar_lead_negocio"; }

    @Override
    public String descripcion() {
        return "Registra a un negocio interesado en vender en HotClick y devuelve el enlace de registro. "
            + "Úsela cuando la persona tenga un negocio y quiera vender o conocer cómo empezar.";
    }

    @Override
    public Map<String, Object> inputSchema() {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("nombre", EsquemasHotClick.texto("Nombre del negocio o de la persona"));
        props.put("tipoNegocio", EsquemasHotClick.texto("Qué vende o a qué se dedica el negocio"));
        props.put("interes", EsquemasHotClick.texto("Qué plan o duda le interesa, si lo mencionó; vacío si no"));
        return EsquemasHotClick.objeto(props, List.of("nombre", "tipoNegocio"));
    }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        if (input == null) return ResultadoHerramienta.error("Falta el nombre o qué vende el negocio.");
        String nombre = input.path("nombre").asText("").trim();
        String tipo = input.path("tipoNegocio").asText("").trim();
        if (nombre.isEmpty() || tipo.isEmpty()) return ResultadoHerramienta.error("Falta el nombre o qué vende el negocio.");
        String contacto = RegistrarLeadHerramienta.ContactoLead.de(contexto);
        if (contacto == null) return ResultadoHerramienta.error("No hay contacto para registrar; derive a una persona.");

        // Siempre lead de HotClick (empresa null): un negocio interesado nunca se asigna a otra tienda.
        leads.registrar(TipoLead.NEGOCIO, null, contacto, RegistrarLeadHerramienta.ContactoLead.canal(contexto),
            contexto.sesionId(), nombre, tipo, input.path("interes").asText(null));
        return ResultadoHerramienta.conAccion(
            "Registrado. Enlace para crear la cuenta de vendedor: " + appUrl + RUTA_REGISTRO
                + " . Comparta este enlace con la persona.",
            new AccionAgente(AccionAgente.Tipo.LEAD_REGISTRADO, TipoLead.NEGOCIO.name()));
    }
}

package com.hotclick.agente.asesor;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.agente.motor.AccionAgente;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.HerramientaAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * {@code pasar_al_chat_tienda}: ofrece el botón a WhatsApp de la tienda, solo si su plan lo permite
 * ({@link ChatTiendaService}). La URL la arma el backend; el modelo no puede elegir número ni destino.
 */
@Component
public class PasarAlChatTiendaHerramienta implements HerramientaAgente {

    private final ChatTiendaService chatTienda;

    public PasarAlChatTiendaHerramienta(ChatTiendaService chatTienda) {
        this.chatTienda = chatTienda;
    }

    @Override public String nombre() { return "pasar_al_chat_tienda"; }

    @Override
    public String descripcion() {
        return "Ofrece seguir la conversación por el chat de WhatsApp de la tienda. Úsela si la persona quiere hablar "
            + "con alguien del negocio. Si la tienda no tiene chat directo, lo indica.";
    }

    @Override
    public Map<String, Object> inputSchema() {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", Map.of("motivo", Map.of("type", "string", "description", "Motivo breve")));
        schema.put("required", List.of("motivo"));
        schema.put("additionalProperties", false);
        return schema;
    }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        Optional<String> url = chatTienda.urlWhatsapp(contexto.empresaId(), contexto.esMarketplace());
        if (url.isEmpty()) {
            return ResultadoHerramienta.ok("Esta tienda no tiene chat directo disponible. Diga que por aquí seguirá "
                + "ayudando con productos, carrito y pedidos; no invente otro contacto.");
        }
        return ResultadoHerramienta.conAccion("Se le muestra a la persona un botón para abrir el chat de la tienda. "
            + "Avísele que lo tiene debajo.", new AccionAgente(AccionAgente.Tipo.CHAT_TIENDA, url.get()));
    }
}

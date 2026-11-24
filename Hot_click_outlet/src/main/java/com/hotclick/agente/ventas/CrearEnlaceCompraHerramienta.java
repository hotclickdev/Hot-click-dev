package com.hotclick.agente.ventas;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.agente.enlace.EnlaceCompraException;
import com.hotclick.agente.enlace.EnlaceCompraService;
import com.hotclick.agente.motor.AccionAgente;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.HerramientaAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.service.whatsapp.WhatsAppHelpers;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * {@code crear_enlace_compra}: arma el enlace de pago con {@link EnlaceCompraService}. Empresa y contacto salen del
 * contexto; el servidor calcula precios y valida que cada producto sea de la tienda. Hoy el único canal en
 * producción es WhatsApp, así que se registra como tal.
 */
@Component
public class CrearEnlaceCompraHerramienta implements HerramientaAgente {

    static final int MAX_ITEMS = 10;

    private final EnlaceCompraService enlaces;

    public CrearEnlaceCompraHerramienta(EnlaceCompraService enlaces) {
        this.enlaces = enlaces;
    }

    @Override public String nombre() { return "crear_enlace_compra"; }

    @Override
    public String descripcion() {
        return "Crea un enlace de pago para los productos que la persona confirmó comprar. "
            + "Use solo ids devueltos por buscar_productos.";
    }

    @Override
    public Map<String, Object> inputSchema() {
        Map<String, Object> item = EsquemasVentas.objeto(Map.of(
            "productoId", Map.of("type", "integer", "description", "Id del producto devuelto por buscar_productos"),
            "cantidad", Map.of("type", "integer", "description", "Unidades a comprar")),
            List.of("productoId", "cantidad"));
        return EsquemasVentas.objeto(Map.of(
            "items", Map.of("type", "array", "description", "Productos a comprar", "items", item)),
            List.of("items"));
    }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        JsonNode nodo = input == null ? null : input.path("items");
        if (nodo == null || !nodo.isArray() || nodo.isEmpty() || nodo.size() > MAX_ITEMS) {
            return ResultadoHerramienta.error("Indique entre 1 y " + MAX_ITEMS + " productos.");
        }
        List<EnlaceCompraService.ItemSolicitado> items = new ArrayList<>();
        for (JsonNode n : nodo) {
            if (!n.path("productoId").canConvertToLong() || !n.path("cantidad").canConvertToInt()) {
                return ResultadoHerramienta.error("Producto o cantidad inválidos.");
            }
            items.add(new EnlaceCompraService.ItemSolicitado(n.path("productoId").asLong(), n.path("cantidad").asInt()));
        }
        try {
            if (contexto.canal() == null) return ResultadoHerramienta.error("Canal no disponible; derive a una persona.");
            // En WhatsApp el contacto es el teléfono (506XXXXXXXX); en Instagram/Messenger es el id del canal.
            String contacto = contexto.canal() == MensajeEntrante.Canal.WHATSAPP
                ? WhatsAppHelpers.normalizarTelefono(contexto.contactoExterno()) : contexto.contactoExterno();
            EnlaceCompraService.EnlaceCreado e = enlaces.crear(
                contexto.empresaId(), contexto.sesionId(), contacto, null, contexto.canal().name(), items);
            return ResultadoHerramienta.conAccion(e.resumenChat(),
                new AccionAgente(AccionAgente.Tipo.ENLACE_CREADO, e.url()));
        } catch (EnlaceCompraException ex) {
            return ResultadoHerramienta.error(ex.getMessage());
        }
    }
}

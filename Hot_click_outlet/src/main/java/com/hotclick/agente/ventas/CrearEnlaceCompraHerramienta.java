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
    private static final String DESCRIPTION = "description";
    private static final String PRODUCTO_ID = "productoId";
    private static final String CANTIDAD = "cantidad";
    private static final String ITEMS = "items";


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
            PRODUCTO_ID, Map.of("type", "integer", DESCRIPTION, "Id del producto devuelto por buscar_productos"),
            CANTIDAD, Map.of("type", "integer", DESCRIPTION, "Unidades a comprar")),
            List.of(PRODUCTO_ID, CANTIDAD));
        return EsquemasVentas.objeto(Map.of(
            ITEMS, Map.of("type", "array", DESCRIPTION, "Productos a comprar", ITEMS, item)),
            List.of(ITEMS));
    }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        JsonNode nodo = input == null ? null : input.path(ITEMS);
        if (nodo == null || !nodo.isArray() || nodo.isEmpty() || nodo.size() > MAX_ITEMS) {
            return ResultadoHerramienta.error("Indique entre 1 y " + MAX_ITEMS + " productos.");
        }
        List<EnlaceCompraService.ItemSolicitado> items = new ArrayList<>();
        for (JsonNode n : nodo) {
            if (!n.path(PRODUCTO_ID).canConvertToLong() || !n.path(CANTIDAD).canConvertToInt()) {
                return ResultadoHerramienta.error("Producto o cantidad inválidos.");
            }
            items.add(new EnlaceCompraService.ItemSolicitado(n.path(PRODUCTO_ID).asLong(), n.path(CANTIDAD).asInt()));
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

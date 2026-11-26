package com.hotclick.agente.ventas;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.agente.catalogo.CatalogoRepositorio.ProductoFila;
import com.hotclick.agente.motor.AccionAgente;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.catalogo.TarjetasCatalogoService;
import com.hotclick.agente.motor.HerramientaAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * {@code mostrar_productos}: pide al canal enviar tarjetas nativas con foto y precio de productos que ya devolvió
 * {@code buscar_productos}. Empresa y destinatario salen del contexto, nunca del modelo; los ids se validan contra el
 * catálogo VISIBLE del negocio, así un id de otra tienda u oculto no produce nada. Sin catálogo de Meta conectado
 * responde que no hay tarjetas y el bot describe en texto: no se envía nada.
 */
@Component
public class MostrarProductosHerramienta implements HerramientaAgente {
    private static final String PRODUCTO_IDS = "productoIds";


    private final TarjetasCatalogoService tarjetas;

    public MostrarProductosHerramienta(TarjetasCatalogoService tarjetas) {
        this.tarjetas = tarjetas;
    }

    @Override public String nombre() { return "mostrar_productos"; }

    @Override
    public String descripcion() {
        return "Envía al cliente tarjetas con foto y precio (máximo " + TarjetasCatalogoService.MAX_TARJETAS
            + ") de productos ya encontrados con buscar_productos. Úsala cuando muestres opciones concretas. "
            + "Si no hay tarjetas disponibles, describa los productos en texto.";
    }

    @Override
    public Map<String, Object> inputSchema() {
        Map<String, Object> props = Map.of(PRODUCTO_IDS, Map.of("type", "array",
            "description", "Ids devueltos por buscar_productos (hasta " + TarjetasCatalogoService.MAX_TARJETAS + ")",
            "items", Map.of("type", "integer")));
        return EsquemasVentas.objeto(props, List.of(PRODUCTO_IDS));
    }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        if (contexto.empresaId() == null || !tarjetas.disponible(contexto.empresaId())) {
            return ResultadoHerramienta.error("No hay tarjetas de producto disponibles; describa los productos en texto.");
        }
        JsonNode nodo = input == null ? null : input.path(PRODUCTO_IDS);
        if (nodo == null || !nodo.isArray() || nodo.isEmpty()) return ResultadoHerramienta.error("Indique al menos un producto.");
        Set<Long> pedidos = new LinkedHashSet<>();
        for (JsonNode n : nodo) {
            if (!n.canConvertToLong()) return ResultadoHerramienta.error("Producto inválido.");
            pedidos.add(n.asLong());
            if (pedidos.size() == TarjetasCatalogoService.MAX_TARJETAS) break;
        }
        List<ProductoFila> visibles = tarjetas.visiblesDe(contexto.empresaId(), new ArrayList<>(pedidos));
        if (visibles.isEmpty()) return ResultadoHerramienta.error("Esos productos no están disponibles en la tienda.");
        String ids = visibles.stream().map(p -> Long.toString(p.id())).collect(Collectors.joining(","));
        return ResultadoHerramienta.conAccion("Se enviarán " + visibles.size() + " tarjeta(s) al cliente.",
            new AccionAgente(AccionAgente.Tipo.MOSTRAR_PRODUCTOS, ids));
    }
}

package com.hotclick.agente.asesor;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.agente.motor.AccionAgente;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.HerramientaAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.rag.service.VectorSearchService;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * {@code agregar_al_carrito}: NO toca ningún carrito (vive en el navegador). Valida que el producto sea visible
 * en el catálogo público y pertenezca al alcance del chat (la tienda, o el marketplace) y devuelve la acción
 * {@link AccionAgente.Tipo#AGREGAR_CARRITO} para que el frontend la aplique sobre su {@code cartStore} cuando la
 * persona aprieta el botón. La empresa sale del contexto, nunca del input del modelo.
 */
@Component
public class AgregarAlCarritoHerramienta implements HerramientaAgente {
    private static final String PRODUCTO_ID = "productoId";
    private static final String CANTIDAD = "cantidad";


    static final int CANTIDAD_MAXIMA = 10;

    private final VectorSearchService busqueda;

    public AgregarAlCarritoHerramienta(VectorSearchService busqueda) {
        this.busqueda = busqueda;
    }

    @Override public String nombre() { return "agregar_al_carrito"; }

    @Override
    public String descripcion() {
        return "Deja listo para agregar al carrito un producto visible del catálogo (id que salió de buscar_productos "
            + "o de la ficha). No modifica nada por sí sola: la persona confirma con un botón.";
    }

    @Override
    public Map<String, Object> inputSchema() {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put(PRODUCTO_ID, Map.of("type", "integer", "description", "Id del producto"));
        props.put(CANTIDAD, Map.of("type", "integer",
            "description", "Unidades, de 1 a " + CANTIDAD_MAXIMA + " (1 si no lo dijo)"));
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", props);
        schema.put("required", List.of(PRODUCTO_ID, CANTIDAD));
        schema.put("additionalProperties", false);
        return schema;
    }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        if (input == null || !input.path(PRODUCTO_ID).canConvertToLong() || !input.path(PRODUCTO_ID).isNumber()) {
            return ResultadoHerramienta.error("Falta el id del producto.");
        }
        long productoId = input.path(PRODUCTO_ID).asLong();
        int pedida = input.path(CANTIDAD).isInt() ? input.path(CANTIDAD).asInt() : 1;
        int cantidad = Math.max(1, Math.min(CANTIDAD_MAXIMA, pedida));

        // Mismo gate de visibilidad que el catálogo público; la tienda sale del contexto (marketplace = sin filtro).
        boolean marketplace = contexto.esMarketplace();
        Long empresaId = marketplace ? null : contexto.empresaId();
        List<ProductoContexto> encontrados = busqueda.buscarPorId(empresaId, productoId, marketplace);
        if (encontrados == null || encontrados.isEmpty()) {
            return ResultadoHerramienta.error("Ese producto no está disponible en el catálogo de esta tienda.");
        }
        ProductoContexto p = encontrados.get(0);
        if (Boolean.TRUE.equals(p.esPersonalizado())) {
            return ResultadoHerramienta.error("Es un producto personalizado: se pide desde su ficha, no se agrega "
                + "desde el chat. Indíquele a la persona que abra la ficha del producto.");
        }
        int stock = p.stock() == null ? 0 : p.stock();
        if (stock <= 0) {
            return ResultadoHerramienta.error("El producto está agotado en este momento.");
        }
        int final_ = Math.min(cantidad, stock);
        String dato = "{\"productoId\":" + productoId + ",\"cantidad\":" + final_ + "}";
        String nota = final_ < pedida
            ? " Solo hay " + final_ + " disponibles; avise que se dejó esa cantidad." : "";
        return ResultadoHerramienta.conAccion("Listo para agregar: " + final_ + " x " + p.nombre()
            + ". Se le muestra a la persona un botón para confirmar; todavía NO está en el carrito." + nota,
            new AccionAgente(AccionAgente.Tipo.AGREGAR_CARRITO, dato));
    }
}

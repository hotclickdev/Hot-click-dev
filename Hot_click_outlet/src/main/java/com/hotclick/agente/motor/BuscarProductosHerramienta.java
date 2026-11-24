package com.hotclick.agente.motor;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.hotclick.RotacionTiendas;
import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.utils.Constants;
import com.hotclick.rag.service.VectorSearchService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * {@code buscar_productos}: búsqueda semántica + keywords sobre el catálogo ({@link VectorSearchService}).
 * El alcance sale del contexto: perfil de empresa → solo esa empresa; HOTCLICK → marketplace con la regla
 * de visibilidad del catálogo público. El modelo NO puede elegir empresa: el input solo trae la consulta.
 */
@Component
public class BuscarProductosHerramienta implements HerramientaAgente {

    private static final Logger log = LoggerFactory.getLogger(BuscarProductosHerramienta.class);
    static final int LIMITE_DEFECTO = 5;
    static final int LIMITE_MAXIMO = 8;
    static final int CONSULTA_MAX = 200;
    /** Marketplace: se pide un conjunto más amplio para poder repartir los lugares entre tiendas (AG-25). */
    static final int FACTOR_POOL_MARKETPLACE = 4;

    private final VectorSearchService busqueda;
    private final ObjectMapper mapper;

    public BuscarProductosHerramienta(VectorSearchService busqueda, ObjectMapper mapper) {
        this.busqueda = busqueda;
        this.mapper = mapper;
    }

    @Override public String nombre() { return "buscar_productos"; }

    @Override
    public String descripcion() {
        return "Busca productos del catálogo por texto (nombre, uso, categoría). Devuelve precio en colones, stock "
            + "disponible y datos básicos. Es la única fuente válida de precios y disponibilidad.";
    }

    @Override
    public Map<String, Object> inputSchema() {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("consulta", EsquemasAgente.texto("Qué busca la persona, en sus palabras (ej: 'bolso de cuero negro')"));
        props.put("limite", EsquemasAgente.entero("Cantidad máxima de resultados, de 1 a " + LIMITE_MAXIMO + " (por defecto " + LIMITE_DEFECTO + ")"));
        return EsquemasAgente.objeto(props, List.of("consulta"));
    }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        String consulta = input.path("consulta").asText("").trim();
        if (consulta.isEmpty()) {
            return ResultadoHerramienta.error("Falta la consulta de búsqueda.");
        }
        if (consulta.length() > CONSULTA_MAX) {
            consulta = consulta.substring(0, CONSULTA_MAX);
        }
        int limite = input.path("limite").isInt() ? input.path("limite").asInt() : LIMITE_DEFECTO;
        limite = Math.max(1, Math.min(LIMITE_MAXIMO, limite));

        boolean marketplace = contexto.esMarketplace();
        // Empresa SIEMPRE del contexto del canal. En marketplace se ignora (la query no filtra por empresa).
        Long empresaId = marketplace ? null : contexto.empresaId();
        int pedido = marketplace ? limite * FACTOR_POOL_MARKETPLACE : limite;
        List<ProductoContexto> productos = busqueda.buscarSimilares(empresaId, consulta, pedido, marketplace);
        if (marketplace && productos != null) {
            // Rotación justa: la visibilidad ya la aplicó la búsqueda; aquí solo se reparte entre tiendas.
            productos = RotacionTiendas.rotar(productos, limite, LocalDate.now(Constants.ZONA_CR).toEpochDay());
        }
        if (productos == null || productos.isEmpty()) {
            return ResultadoHerramienta.ok("{\"productos\":[],\"nota\":\"Sin resultados para esa búsqueda.\"}");
        }
        List<Map<String, Object>> filas = new ArrayList<>();
        for (ProductoContexto p : productos) {
            filas.add(fila(p, marketplace));
        }
        try {
            return ResultadoHerramienta.ok(mapper.writeValueAsString(Map.of("productos", filas)));
        } catch (JsonProcessingException e) {
            log.warn("[agente-motor] buscar_productos no pudo serializar resultados");
            return ResultadoHerramienta.error("No se pudo preparar el resultado.");
        }
    }

    private static Map<String, Object> fila(ProductoContexto p, boolean marketplace) {
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("id", p.id());
        f.put("nombre", p.nombre());
        f.put("precioColones", p.precio());
        if (p.precioEtiqueta() != null) f.put("precioEtiqueta", p.precioEtiqueta());
        f.put("stockDisponible", p.stock());
        if (p.categoria() != null) f.put("categoria", p.categoria());
        if (p.descripcionCorta() != null) f.put("descripcion", p.descripcionCorta());
        if (Boolean.TRUE.equals(p.esPersonalizado())) f.put("personalizado", true);
        if (marketplace) {
            if (p.empresaNombre() != null) f.put("negocio", p.empresaNombre());
            if (p.empresaSlug() != null) f.put("tienda", p.empresaSlug());
        }
        return f;
    }
}

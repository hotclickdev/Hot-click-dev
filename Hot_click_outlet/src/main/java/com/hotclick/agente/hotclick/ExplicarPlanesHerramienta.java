package com.hotclick.agente.hotclick;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.HerramientaAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.agente.ventas.ConocimientoRepository;
import com.hotclick.agente.ventas.ConocimientoService;
import com.hotclick.model.Plan;
import com.hotclick.repository.PlanRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * {@code explicar_planes}: planes de HotClick para vendedores. Las cifras (precio, comisión, límites, bot) salen
 * SIEMPRE de {@code hot_click_plan_tb}; el texto explicativo, del conocimiento de HotClick (categoría PLANES) que
 * aprueba el dueño. Si todavía no hay texto aprobado, se entrega un texto por defecto marcado como PROVISIONAL.
 * Nada se inventa: lo que no está en la tabla ni en el conocimiento no se afirma.
 */
@Component
public class ExplicarPlanesHerramienta implements HerramientaAgente {

    private static final Logger log = LoggerFactory.getLogger(ExplicarPlanesHerramienta.class);

    /** Categoría del conocimiento de HotClick donde el dueño publica el texto de los planes. */
    static final String CATEGORIA_PLANES = "PLANES";
    static final List<String> PLANES_VENDEDOR = List.of("EMPRENDEDOR", "PYME", "NEGOCIO_PLUS");

    static final String TEXTO_PROVISIONAL = "PROVISIONAL, pendiente de aprobación del dueño: HotClick ofrece tres "
        + "planes para vendedores (Emprendedor, PyME y Negocio Plus). Las cifras exactas de cada plan son las de "
        + "'planes'. No prometa beneficios que no estén en esas cifras y aclare que los detalles pueden ajustarse.";

    private final PlanRepository planes;
    private final ConocimientoService conocimiento;
    private final ObjectMapper mapper;

    public ExplicarPlanesHerramienta(PlanRepository planes, ConocimientoService conocimiento, ObjectMapper mapper) {
        this.planes = planes;
        this.conocimiento = conocimiento;
        this.mapper = mapper;
    }

    @Override public String nombre() { return "explicar_planes"; }

    @Override
    public String descripcion() {
        return "Explica los planes de HotClick para vendedores (Emprendedor, PyME, Negocio Plus) con precio, comisión, "
            + "límites y si incluyen el bot. Es la única fuente válida de precios y condiciones de los planes.";
    }

    @Override
    public Map<String, Object> inputSchema() {
        return EsquemasHotClick.objeto(Map.of(
            "plan", EsquemasHotClick.texto("Nombre del plan por el que pregunta; vacío para todos")), List.of());
    }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        String filtro = input == null ? "" : normalizar(input.path("plan").asText(""));
        List<Plan> activos = planes.findByActivoTrue(PageRequest.of(0, 20, Sort.by("precioMensual"))).getContent();
        List<Map<String, Object>> filas = new ArrayList<>();
        for (Plan p : activos) {
            String clave = normalizar(p.getNombre());
            if (!PLANES_VENDEDOR.contains(clave)) continue;
            if (!filtro.isEmpty() && !clave.contains(filtro) && !filtro.contains(clave)) continue;
            filas.add(fila(p));
        }
        if (filas.isEmpty()) {
            return ResultadoHerramienta.error("No hay un plan con ese nombre. No invente: ofrezca derivar a una persona.");
        }
        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("planes", filas);
        salida.put("explicacion", textoAprobado());
        try {
            return ResultadoHerramienta.ok(mapper.writeValueAsString(salida));
        } catch (JsonProcessingException e) {
            log.warn("[agente-planes] no se pudo serializar los planes");
            return ResultadoHerramienta.error("No se pudo preparar el resultado.");
        }
    }

    private static Map<String, Object> fila(Plan p) {
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("plan", p.getNombre());
        f.put("precioMensualColones", p.getPrecioMensual());
        f.put("comisionPorVentaPorcentaje", p.getComisionPorcentaje());
        f.put("maxProductos", limite(p.getMaxProductos()));
        f.put("maxUsuarios", limite(p.getMaxUsuarios()));
        // El plan incluye el bot cuando tiene IA con créditos (la misma feature "ai" que exige el panel de bots).
        f.put("incluyeBot", Boolean.TRUE.equals(p.getTieneAi()) && p.getMaxCreditosAi() != null && p.getMaxCreditosAi() != 0);
        f.put("incluyePos", Boolean.TRUE.equals(p.getTienePos()));
        f.put("incluyeCrm", Boolean.TRUE.equals(p.getTieneCrm()));
        return f;
    }

    /** -1 = ilimitado en la tabla de planes. */
    private static Object limite(Integer valor) {
        return valor != null && valor < 0 ? "ilimitado" : valor;
    }

    private String textoAprobado() {
        try {
            StringBuilder sb = new StringBuilder();
            for (ConocimientoRepository.Fila c : conocimiento.listar(null)) {
                if (c.activo() && CATEGORIA_PLANES.equalsIgnoreCase(c.categoria())) {
                    sb.append(c.titulo()).append(": ").append(c.contenido()).append('\n');
                }
            }
            if (!sb.isEmpty()) return sb.toString().strip();
        } catch (RuntimeException e) {
            log.warn("[agente-planes] conocimiento de planes no disponible ({})", e.getClass().getSimpleName());
        }
        return TEXTO_PROVISIONAL;
    }

    private static String normalizar(String nombre) {
        return nombre == null ? "" : nombre.strip().toUpperCase(Locale.ROOT).replace(' ', '_');
    }
}

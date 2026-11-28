package com.hotclick.service.contador;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.service.contador.ComprasFiscalesProvider.ResumenCompras;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Herramientas que la IA puede usar. TODAS son de solo lectura y agregadas a nivel plataforma: no hay ninguna que
 * escriba, presente, pague o borre, ni que devuelva datos de un negocio en particular. Una herramienta que no esta en
 * {@link #NOMBRES} se rechaza sin ejecutar nada (asi una instruccion inyectada nunca dispara una accion).
 */
@Component
public class ContadorHerramientas {

    public static final String VENTAS = "ventas_por_mes";
    public static final String COMPRAS = "compras_e_iva";
    public static final String CONFIG = "config_fiscal";
    public static final String CALENDARIO = "calendario";
    public static final String NORMATIVA = "buscar_normativa";
    public static final Set<String> NOMBRES = Set.of(VENTAS, COMPRAS, CONFIG, CALENDARIO, NORMATIVA);

    private final VentasFiscalesService ventas;
    private final ComprasFiscalesProvider compras;
    private final ContadorFiscalService fiscal;
    private final ContadorParametrosService parametros;
    private final ContadorAjustesService ajustes;
    private final ContadorNormativaService normativa;
    private final com.hotclick.service.fiscal.ConfiguracionFiscalService reglas;
    private final ObjectMapper mapper;

    public ContadorHerramientas(VentasFiscalesService ventas, ComprasFiscalesProvider compras, ContadorFiscalService fiscal,
                                ContadorParametrosService parametros, ContadorAjustesService ajustes,
                                ContadorNormativaService normativa,
                                com.hotclick.service.fiscal.ConfiguracionFiscalService reglas, ObjectMapper mapper) {
        this.ventas = ventas;
        this.compras = compras;
        this.fiscal = fiscal;
        this.parametros = parametros;
        this.ajustes = ajustes;
        this.normativa = normativa;
        this.reglas = reglas;
        this.mapper = mapper;
    }

    public List<Map<String, Object>> definiciones() {
        Map<String, Object> anio = Map.of("type", "integer", "description", "Año (2020 al actual)");
        return List.of(
            herramienta(VENTAS, "Ventas de HotClick por mes (base sin IVA, IVA cobrado, comprobantes aceptados). Solo lectura.",
                Map.of("anio", anio), List.of("anio")),
            herramienta(COMPRAS, "Compras a los negocios por mes: con y sin crédito de IVA, e IVA acreditable. Solo lectura.",
                Map.of("anio", anio), List.of("anio")),
            herramienta(CONFIG, "Configuración fiscal y parámetros que configuró el dueño (régimen, factores, tramos). Solo lectura.",
                Map.of(), List.of()),
            herramienta(CALENDARIO, "Próximos vencimientos según el régimen activo. Solo lectura.", Map.of(), List.of()),
            herramienta(NORMATIVA, "Busca en la normativa tributaria cargada por el dueño. Devuelve fuente y extracto. Solo lectura.",
                Map.of("consulta", Map.of("type", "string", "description", "Texto a buscar, máximo 200 caracteres")),
                List.of("consulta")));
    }

    /** Resultado de una herramienta como JSON. Nunca lanza: los errores vuelven como texto para el modelo. */
    public String ejecutar(String nombre, JsonNode entrada, LocalDate hoy) {
        try {
            if (nombre == null || !NOMBRES.contains(nombre)) return "{\"error\":\"herramienta no disponible\"}";
            Object r = switch (nombre) {
                case VENTAS -> ventas.delAnio(anio(entrada, hoy));
                case COMPRAS -> comprasAnio(anio(entrada, hoy));
                case CONFIG -> config();
                case CALENDARIO -> fiscal.calendario(hoy);
                default -> normativa.buscar(entrada == null ? "" : entrada.path("consulta").asText(""));
            };
            String json = mapper.writeValueAsString(r);
            return json.length() > 12_000 ? json.substring(0, 12_000) : json;
        } catch (IllegalArgumentException | JsonProcessingException e) {
            return "{\"error\":\"entrada inválida\"}";
        } catch (RuntimeException e) {
            return "{\"error\":\"no disponible\"}";
        }
    }

    private static int anio(JsonNode entrada, LocalDate hoy) {
        int a = entrada == null ? hoy.getYear() : entrada.path("anio").asInt(hoy.getYear());
        if (a < 2020 || a > hoy.getYear()) throw new IllegalArgumentException("año fuera de rango");
        return a;
    }

    private Map<String, Object> comprasAnio(int anio) {
        ResumenCompras[] r = compras.anio(anio);
        List<Map<String, Object>> meses = new ArrayList<>();
        boolean hay = false;
        for (int i = 0; i < 12; i++) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("mes", i + 1);
            m.put("comprasConCredito", r[i].comprasConCredito());
            m.put("comprasSinCredito", r[i].comprasSinCredito());
            m.put("ivaAcreditable", r[i].ivaAcreditable());
            meses.add(m);
            hay |= r[i].hayDatos();
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("hayDatos", hay);
        out.put("nota", hay ? "" : "Todavía no hay facturas de negocios registradas: no hay compras que acreditar.");
        out.put("meses", meses);
        return out;
    }

    private Map<String, Object> config() {
        var r = reglas.reglas();
        var a = ajustes.ajustes();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("regimen", r.regimen());
        out.put("recargoNoInscritoPct", r.extraNoInscritoPct());
        out.put("diasEnviarFactura", r.diasEnviarFactura());
        out.put("salarioBaseCrc", a.salarioBaseCrc());
        out.put("topeCompraAnualRtsCrc", ContadorCalculos.topeAnualRts(a.salarioBaseCrc()));
        out.put("parametros", parametros.todos());
        out.put("nota", "Valores configurados por el dueño; no verificados por un contador.");
        return out;
    }

    private static Map<String, Object> herramienta(String nombre, String descripcion, Map<String, Object> props, List<String> req) {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", props);
        schema.put("required", req);
        Map<String, Object> h = new LinkedHashMap<>();
        h.put("name", nombre);
        h.put("description", descripcion);
        h.put("input_schema", schema);
        return h;
    }

    /** Solo para pruebas: la plataforma es el unico "tenant" que leen estas herramientas. */
    static long empresaLeida() { return Constants.EMPRESA_PLATAFORMA_ID; }
}

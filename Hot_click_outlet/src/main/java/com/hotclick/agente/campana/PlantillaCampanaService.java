package com.hotclick.agente.campana;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.campana.PlantillaCampanaRepositorio.Estado;
import com.hotclick.agente.campana.PlantillaCampanaRepositorio.Fila;
import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.conexion.MetaGraphCliente;
import com.hotclick.agente.webhook.EstadoEntrante;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.exception.RecursoNoEncontradoException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Plantillas de categoría MARKETING del negocio (AG-36). El alta va a Meta por la API de la WABA de la cuenta
 * conectada del negocio y queda PENDIENTE hasta que Meta la aprueba o la rechaza (webhook
 * {@code message_template_status_update} o consulta manual). Solo una plantilla APROBADA puede usarse en una campaña.
 * Si Meta no confirma el alta (rechazo o caída) no se guarda nada: el negocio ve el error y reintenta.
 */
@Service
public class PlantillaCampanaService {

    private static final Logger log = LoggerFactory.getLogger(PlantillaCampanaService.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    static final Pattern NOMBRE = Pattern.compile("[a-z0-9_]{3,100}");
    private static final Pattern VARIABLE = Pattern.compile("\\{\\{(\\d+)}}");
    static final int MAX_CUERPO = 1024;
    static final String IDIOMA = "es";

    private final PlantillaCampanaRepositorio repo;
    private final CanalCuentaService cuentas;
    private final MetaGraphCliente graph;
    private final CampanaConfig config;

    public PlantillaCampanaService(PlantillaCampanaRepositorio repo, CanalCuentaService cuentas, MetaGraphCliente graph,
                                   CampanaConfig config) {
        this.repo = repo;
        this.cuentas = cuentas;
        this.graph = graph;
        this.config = config;
    }

    /** Cantidad de variables {{n}} del cuerpo; deben ser consecutivas desde {{1}}. */
    static int contarVariables(String cuerpo) {
        Matcher m = VARIABLE.matcher(cuerpo);
        int max = 0;
        java.util.Set<Integer> vistas = new java.util.HashSet<>();
        while (m.find()) {
            int n = Integer.parseInt(m.group(1));
            vistas.add(n);
            max = Math.max(max, n);
        }
        for (int i = 1; i <= max; i++) {
            if (!vistas.contains(i)) throw new IllegalArgumentException("Las variables deben ser {{1}}, {{2}}… sin saltos");
        }
        return max;
    }

    public Fila crear(Long empresaId, String nombre, String cuerpo, List<String> ejemplos) {
        String n = nombre == null ? "" : nombre.strip().toLowerCase(Locale.ROOT);
        if (!NOMBRE.matcher(n).matches())
            throw new IllegalArgumentException("El nombre usa solo minúsculas, números y guion bajo (3 a 100)");
        String texto = cuerpo == null ? "" : cuerpo.strip();
        if (texto.isEmpty() || texto.length() > MAX_CUERPO)
            throw new IllegalArgumentException("El texto es obligatorio y llega hasta " + MAX_CUERPO + " caracteres");
        if (texto.startsWith("{{") || texto.endsWith("}}"))
            throw new IllegalArgumentException("Meta no admite que el texto empiece o termine con una variable");
        int variables = contarVariables(texto);
        List<String> ej = ejemplos == null ? List.of() : ejemplos;
        if (ej.size() != variables) throw new IllegalArgumentException("Falta un ejemplo por cada variable");
        if (repo.existeNombre(empresaId, n, IDIOMA)) throw new IllegalStateException("Ya existe una plantilla con ese nombre");

        CanalCuenta cuenta = cuentas.activaDe(empresaId, MensajeEntrante.Canal.WHATSAPP)
            .filter(c -> c.getWabaId() != null && !c.getWabaId().isBlank())
            .orElseThrow(() -> new IllegalStateException("Conectá primero tu WhatsApp Business"));
        MetaGraphCliente.PlantillaRemota remota = graph.crearPlantilla(cuenta.getWabaId(), cuentas.tokenDe(cuenta),
            cuerpoMeta(n, texto, ej));
        Estado estado = aEstado(remota.estado());
        String ejemplosJson = escribir(ej);
        long id = repo.insertar(empresaId, n, IDIOMA, texto, ejemplosJson, estado, remota.id(), config.ahora());
        log.info("[campana-plantilla] plantilla {} enviada a Meta empresa={} estado={}", id, empresaId, estado);
        return repo.obtener(empresaId, id).orElseThrow();
    }

    /** JSON de la Graph API: categoría MARKETING, idioma {@code es} y un componente BODY con sus ejemplos. */
    static Map<String, Object> cuerpoMeta(String nombre, String texto, List<String> ejemplos) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "BODY");
        body.put("text", texto);
        if (!ejemplos.isEmpty()) body.put("example", Map.of("body_text", List.of(ejemplos)));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", nombre);
        m.put("category", "MARKETING");
        m.put("language", IDIOMA);
        m.put("components", List.of(body));
        return m;
    }

    public List<Fila> listar(Long empresaId) {
        return repo.listar(empresaId);
    }

    public Fila obtener(Long empresaId, long id) {
        return repo.obtener(empresaId, id).orElseThrow(() -> new RecursoNoEncontradoException("Plantilla no encontrada"));
    }

    /** Consulta el estado a Meta (respaldo cuando el webhook no llegó). Otra empresa responde como inexistente. */
    public Fila sincronizar(Long empresaId, long id) {
        Fila f = obtener(empresaId, id);
        if (f.metaPlantillaId() == null) return f;
        CanalCuenta cuenta = cuentas.activaDe(empresaId, MensajeEntrante.Canal.WHATSAPP)
            .orElseThrow(() -> new IllegalStateException("Conectá primero tu WhatsApp Business"));
        MetaGraphCliente.PlantillaRemota r = graph.estadoPlantilla(f.metaPlantillaId(), cuentas.tokenDe(cuenta));
        repo.actualizarEstadoPorMetaId(f.metaPlantillaId(), aEstado(r.estado()), motivoSeguro(r.motivo()), config.ahora());
        return obtener(empresaId, id);
    }

    /** Webhook {@code message_template_status_update}. Idempotente; un evento sin plantilla conocida se ignora. */
    public void aplicarEstadoWebhook(EstadoEntrante.EstadoPlantilla ev) {
        int n = repo.actualizarEstadoPorMetaId(ev.plantillaId(), aEstado(ev.evento()), motivoSeguro(ev.razon()),
            config.ahora());
        if (n > 0) log.info("[campana-plantilla] estado de plantilla actualizado por webhook: {}", aEstado(ev.evento()));
    }

    /** APPROVED → APROBADA; REJECTED/DISABLED/PAUSED/DELETED → RECHAZADA (no se puede usar); el resto → PENDIENTE. */
    static Estado aEstado(String meta) {
        String e = meta == null ? "" : meta.toUpperCase(Locale.ROOT);
        return switch (e) {
            case "APPROVED" -> Estado.APROBADA;
            case "REJECTED", "DISABLED", "PAUSED", "DELETED" -> Estado.RECHAZADA;
            default -> Estado.PENDIENTE;
        };
    }

    /** Solo un código corto de motivo de Meta, nunca texto libre largo. */
    private static String motivoSeguro(String m) {
        if (m == null || m.isBlank()) return null;
        String s = m.strip();
        return s.length() > 60 ? s.substring(0, 60) : s;
    }

    static List<String> leerEjemplos(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            return JSON.readValue(json, JSON.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (JsonProcessingException e) {
            return new ArrayList<>();
        }
    }

    private static String escribir(List<String> ejemplos) {
        try {
            return JSON.writeValueAsString(ejemplos);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Ejemplos inválidos");
        }
    }
}

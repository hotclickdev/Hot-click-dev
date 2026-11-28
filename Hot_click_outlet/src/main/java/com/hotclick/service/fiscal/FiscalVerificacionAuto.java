package com.hotclick.service.fiscal;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.service.HaciendaContribuyenteService;
import com.hotclick.service.HaciendaContribuyenteService.ContribuyenteDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Comprobación automática de lo que el negocio declara contra la API pública de Hacienda (vía
 * {@link HaciendaContribuyenteService}). El resultado NUNCA quita el extra por sí solo: solo ayuda al ADMIN a
 * aprobar. No registra la cédula ni la respuesta en logs (Ley 8968).
 */
@Service
public class FiscalVerificacionAuto {

    public static final String COINCIDE = "COINCIDE";
    public static final String NO_COINCIDE = "NO_COINCIDE";
    public static final String NO_ENCONTRADO = "NO_ENCONTRADO";
    public static final String ERROR_CONSULTA = "ERROR_CONSULTA";

    /** Resultado: estado y detalle JSON corto (≤ 2000 caracteres) listo para guardar. */
    public record Resultado(String estado, String detalle) {}

    private static final Logger log = LoggerFactory.getLogger(FiscalVerificacionAuto.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final int MAX_DETALLE = 2000;
    private static final double UMBRAL_NOMBRE = 0.75;
    private static final Set<String> RUIDO_NOMBRE = Set.of("sa", "sociedad", "anonima", "srl", "limitada", "ltda",
        "de", "del", "la", "el", "los", "las", "y", "cia", "compania");

    private final HaciendaContribuyenteService hacienda;

    public FiscalVerificacionAuto(HaciendaContribuyenteService hacienda) { this.hacienda = hacienda; }

    /** Consulta y compara. Nunca lanza: una falla de la API queda como ERROR_CONSULTA. */
    public Resultado comprobar(String cedula, SituacionFiscal declarada, String nombre, String actividad) {
        ContribuyenteDTO dto;
        try {
            dto = hacienda.consultar(cedula);
        } catch (Exception e) {
            log.warn("Comprobación fiscal: consulta a Hacienda falló ({})", e.getClass().getSimpleName());
            return new Resultado(ERROR_CONSULTA, "{\"error\":\"consulta\"}");
        }
        return comparar(dto, declarada, nombre, actividad);
    }

    /** Parte pura (sin red), probada aparte. */
    static Resultado comparar(ContribuyenteDTO dto, SituacionFiscal declarada, String nombre, String actividad) {
        if (dto == null || "SERVICIO_NO_DISPONIBLE".equalsIgnoreCase(dto.estadoInscripcion())) {
            return new Resultado(ERROR_CONSULTA, "{\"error\":\"consulta\"}");
        }
        if ("NO_ENCONTRADO".equalsIgnoreCase(dto.estadoInscripcion())) {
            return new Resultado(NO_ENCONTRADO, "{\"diferencias\":[\"cedula\"]}");
        }
        List<String> diferencias = new ArrayList<>();
        String estado = dto.estadoInscripcion() == null ? "" : dto.estadoInscripcion().trim();
        if (!estado.isEmpty() && !dto.inscrito()) diferencias.add("situacion");
        SituacionFiscal esperado = regimenDe(dto.regimen());
        if (esperado != null && declarada != null && esperado != declarada) diferencias.add("regimen");
        if (dto.nombre() != null && !dto.nombre().isBlank() && !nombreParecido(nombre, dto.nombre())) diferencias.add("nombre");
        List<String> actividades = dto.actividades() == null ? List.of() : dto.actividades();
        if (!actividades.isEmpty() && !actividadEntre(actividad, actividades)) diferencias.add("actividad");

        Map<String, Object> d = new LinkedHashMap<>();
        d.put("nombre", recortar(dto.nombre(), 150));
        d.put("regimen", recortar(dto.regimen(), 100));
        d.put("estado", recortar(estado, 40));
        List<String> acts = new ArrayList<>();
        for (String a : actividades) acts.add(recortar(a, 120));
        d.put("actividades", acts);
        d.put("diferencias", diferencias);
        return new Resultado(diferencias.isEmpty() ? COINCIDE : NO_COINCIDE, aJson(d));
    }

    /** "Simplificado" en la descripción → REGIMEN_SIMPLIFICADO; cualquier otro régimen → INSCRITO; vacío → null. */
    static SituacionFiscal regimenDe(String regimen) {
        if (regimen == null || regimen.isBlank()) return null;
        return normalizar(regimen).contains("simplific") ? SituacionFiscal.REGIMEN_SIMPLIFICADO : SituacionFiscal.INSCRITO;
    }

    /** Sin tildes ni mayúsculas ni sufijos societarios; coincide si comparten al menos 75 % de las palabras del más corto. */
    static boolean nombreParecido(String declarado, String hacienda) {
        Set<String> a = palabras(declarado);
        Set<String> b = palabras(hacienda);
        if (a.isEmpty() || b.isEmpty()) return false;
        Set<String> comunes = new HashSet<>(a);
        comunes.retainAll(b);
        return (double) comunes.size() / Math.min(a.size(), b.size()) >= UMBRAL_NOMBRE;
    }

    /** El código de actividad declarado aparece entre los de Hacienda, o la descripción comparte palabras. */
    static boolean actividadEntre(String declarada, List<String> deHacienda) {
        if (declarada == null || declarada.isBlank()) return false;
        String dec = normalizar(declarada);
        Set<String> palabrasDec = palabras(declarada);
        for (String h : deHacienda) {
            String hn = normalizar(h);
            String codigo = hn.contains(" ") ? hn.substring(0, hn.indexOf(' ')) : hn;
            if (!codigo.isEmpty() && codigo.chars().allMatch(Character::isDigit) && dec.contains(codigo)) return true;
            Set<String> ph = palabras(h);
            ph.removeIf(p -> p.chars().allMatch(Character::isDigit));
            if (ph.isEmpty() || palabrasDec.isEmpty()) continue;
            Set<String> comunes = new HashSet<>(palabrasDec);
            comunes.retainAll(ph);
            if ((double) comunes.size() / Math.min(palabrasDec.size(), ph.size()) >= 0.5) return true;
        }
        return false;
    }

    private static Set<String> palabras(String texto) {
        Set<String> out = new HashSet<>();
        for (String p : normalizar(texto).split(" ")) {
            if (p.length() > 1 && !RUIDO_NOMBRE.contains(p)) out.add(p);
        }
        return out;
    }

    static String normalizar(String texto) {
        if (texto == null) return "";
        String sinTildes = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return sinTildes.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }

    private static String recortar(String v, int max) {
        if (v == null) return "";
        return v.length() > max ? v.substring(0, max) : v;
    }

    private static String aJson(Map<String, Object> m) {
        try {
            String s = JSON.writeValueAsString(m);
            return s.length() > MAX_DETALLE ? s.substring(0, MAX_DETALLE) : s;
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    /** Lee de vuelta el detalle guardado; ante cualquier problema, mapa vacío. */
    @SuppressWarnings("unchecked")
    public static Map<String, Object> leerDetalle(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return JSON.readValue(json, Map.class);
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }
}

package com.hotclick.service.fiscal.facturanegocio;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.FacturaNegocio;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Vistas (DTO en Map) de la factura del negocio. Nunca se expone la entidad ni las rutas internas de almacenamiento. */
public final class FacturaNegocioVista {

    static final String SEPARADOR = "\n";
    static final String PREFIJO_AVISO = "AVISO: ";

    private static final ObjectMapper JSON = new ObjectMapper();

    private FacturaNegocioVista() {}

    public static Map<String, Object> negocio(FacturaNegocio f, LocalDate hoy, boolean regimenTradicional) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", f.getId());
        m.put("periodoDesde", f.getPeriodoDesde());
        m.put("periodoHasta", f.getPeriodoHasta());
        m.put("montoCrc", f.getMontoCrc());
        m.put("fechaLimite", f.getFechaLimite());
        m.put("diasRestantes", FacturaNegocioCalculo.diasRestantes(hoy, f.getFechaLimite()));
        m.put("estado", f.getEstado());
        m.put("clave", f.getClaveXml());
        m.put("totalFacturaCrc", f.getTotalFacturaCrc());
        m.put("totalIvaCrc", f.getTotalIvaCrc());
        m.put("errores", errores(f.getMensajeValidacion()));
        m.put("avisos", avisos(f.getMensajeValidacion()));
        m.put("fechaRecibida", f.getFechaRecibida());
        m.put("respuestaHacienda", f.getRespuestaHaciendaEstado());
        m.put("recordatorios", f.getRecordatorios());
        m.put("ultimoRecordatorio", f.getUltimoRecordatorio());
        m.put("mensajeReceptorEstado", f.getMensajeReceptorEstado());
        // El plazo legal del mensaje receptor solo tiene sentido en régimen tradicional.
        m.put("fechaLimiteMensajeReceptor", regimenTradicional ? f.getFechaLimiteMensajeReceptor() : null);
        m.put("desglose", desglose(f.getDesgloseJson()));
        return m;
    }

    public static Map<String, Object> admin(FacturaNegocio f, String nombreNegocio, LocalDate hoy, boolean tradicional) {
        Map<String, Object> m = negocio(f, hoy, tradicional);
        m.put("empresaId", f.getEmpresaId());
        m.put("nombreNegocio", nombreNegocio);
        m.put("cedulaEmisor", f.getCedulaEmisor());
        m.put("revisada", f.isRevisada());
        m.put("fechaRevision", f.getFechaRevision());
        m.put("tieneXml", f.getXmlPath() != null);
        m.put("tieneRespuestaHacienda", f.getXmlRespuestaPath() != null);
        m.put("mensajeReceptorDetalle", f.getMensajeReceptorDetalle());
        m.put("fechaLimiteMensajeReceptor", f.getFechaLimiteMensajeReceptor());
        return m;
    }

    public static List<Map<String, Object>> lista(List<FacturaNegocio> registros, LocalDate hoy, boolean tradicional) {
        List<Map<String, Object>> r = new ArrayList<>();
        for (FacturaNegocio f : registros) r.add(negocio(f, hoy, tradicional));
        return r;
    }

    /** La más reciente que todavía se puede subir (PENDIENTE, RECHAZADA o VENCIDA), o null. */
    public static Map<String, Object> primeraPorSubir(List<Map<String, Object>> vistas, java.util.Set<String> estados) {
        for (Map<String, Object> v : vistas) {
            if (estados.contains(String.valueOf(v.get("estado")))) return v;
        }
        return null;
    }

    /** Vista ADMIN de una página: el nombre del negocio sale de un mapa ya cargado en lote (sin consulta por fila). */
    public static List<Map<String, Object>> listaAdmin(List<FacturaNegocio> registros, Map<Long, String> nombres,
                                                       LocalDate hoy, boolean tradicional) {
        List<Map<String, Object>> r = new ArrayList<>();
        for (FacturaNegocio f : registros) r.add(admin(f, nombres.get(f.getEmpresaId()), hoy, tradicional));
        return r;
    }

    public static List<Long> empresaIds(List<FacturaNegocio> registros) {
        java.util.LinkedHashSet<Long> ids = new java.util.LinkedHashSet<>();
        for (FacturaNegocio f : registros) ids.add(f.getEmpresaId());
        return new ArrayList<>(ids);
    }

    /** Guarda errores y avisos en la columna de texto (avisos con prefijo), cortado al largo de la columna. */
    static String empaquetar(List<String> errores, List<String> avisos) {
        List<String> todo = new ArrayList<>(errores);
        for (String a : avisos) todo.add(PREFIJO_AVISO + a);
        String t = String.join(SEPARADOR, todo);
        return t.length() > 2000 ? t.substring(0, 2000) : t;
    }

    static List<String> errores(String paquete) {
        if (paquete == null || paquete.isBlank()) return List.of();
        return Arrays.stream(paquete.split(SEPARADOR)).filter(s -> !s.startsWith(PREFIJO_AVISO)).toList();
    }

    static List<String> avisos(String paquete) {
        if (paquete == null || paquete.isBlank()) return List.of();
        return Arrays.stream(paquete.split(SEPARADOR)).filter(s -> s.startsWith(PREFIJO_AVISO))
            .map(s -> s.substring(PREFIJO_AVISO.length())).toList();
    }

    static List<Map<String, Object>> desglose(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return JSON.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}

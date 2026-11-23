package com.hotclick.service.reintegro;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.repository.PagoRepository;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.utils.Constants;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Saldo por reintegrar: cobros en línea que cayeron a la cuenta PRINCIPAL de HotClick (sin split) y que HotClick
 * le debe al negocio. Solo lo usa el ADMIN de plataforma. Los montos van en la moneda del pago (no se mezclan).
 * Marcar reintegrado es idempotente (UPDATE condicional) y queda auditado con quién y cuándo.
 */
@Service
public class ReintegroPlataformaService {

    public enum Resultado { MARCADO, YA_REINTEGRADO, NO_APLICA }

    static final int MAX_PAGOS = 2000;
    static final int MAX_NOTA = 300;

    private final PagoRepository pagoRepository;
    private final AuditoriaAdminRegistroService auditoria;

    public ReintegroPlataformaService(PagoRepository pagoRepository, AuditoriaAdminRegistroService auditoria) {
        this.pagoRepository = pagoRepository;
        this.auditoria = auditoria;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> resumenPorNegocio() {
        Map<String, Map<String, Object>> grupos = new LinkedHashMap<>();
        for (Pago p : pagoRepository.pagosConReintegro(Constants.PAGO_CAPTURADO, PageRequest.of(0, MAX_PAGOS))) {
            Empresa e = p.getPedido() != null ? p.getPedido().getEmpresa() : null;
            if (e == null) continue;
            String moneda = p.getMoneda() == null ? "CRC" : p.getMoneda();
            Map<String, Object> g = grupos.computeIfAbsent(e.getId() + "|" + moneda, k -> nuevoGrupo(e, moneda));
            int monto = p.getMonto() == null ? 0 : p.getMonto();
            boolean hecho = Pago.REINTEGRO_HECHO.equals(p.getReintegroEstado());
            String clave = hecho ? "montoReintegrado" : "montoPendiente";
            g.put(clave, ((Number) g.get(clave)).longValue() + monto);
            if (!hecho) g.put("cantidadPendiente", ((Number) g.get("cantidadPendiente")).intValue() + 1);
            @SuppressWarnings("unchecked") List<Map<String, Object>> pagos = (List<Map<String, Object>>) g.get("pagos");
            pagos.add(fila(p, monto, hecho));
        }
        return new ArrayList<>(grupos.values());
    }

    private static Map<String, Object> nuevoGrupo(Empresa e, String moneda) {
        Map<String, Object> g = new LinkedHashMap<>();
        g.put("empresaId", e.getId());
        g.put("negocio", e.getNombreComercial() != null && !e.getNombreComercial().isBlank() ? e.getNombreComercial() : e.getNombreEmpresa());
        g.put("moneda", moneda);
        g.put("montoPendiente", 0L);
        g.put("montoReintegrado", 0L);
        g.put("cantidadPendiente", 0);
        g.put("pagos", new ArrayList<Map<String, Object>>());
        return g;
    }

    private static Map<String, Object> fila(Pago p, int monto, boolean hecho) {
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("pagoId", p.getId());
        f.put("pedido", p.getPedido().getNumeroPedido());
        f.put("monto", monto);
        f.put("moneda", p.getMoneda() == null ? "CRC" : p.getMoneda());
        f.put("estado", hecho ? "REINTEGRADO" : "NO_REINTEGRADO");
        f.put("fecha", p.getFechaCreacion());
        f.put("reintegradoPor", p.getReintegradoPor());
        f.put("reintegradoEn", p.getReintegradoEn());
        f.put("nota", p.getReintegroNota());
        return f;
    }

    /** Marca un cobro como reintegrado. Repetirlo no cambia nada ni duplica la auditoría. */
    @Transactional
    public Resultado marcarReintegrado(Long pagoId, String actor, String nota) {
        String notaLimpia = limpiarNota(nota);
        int cambiado = pagoRepository.marcarReintegrado(pagoId, actorSeguro(actor), LocalDateTime.now(Constants.ZONA_CR),
            notaLimpia, Constants.PAGO_CAPTURADO);
        if (cambiado == 1) {
            Long empresaId = pagoRepository.findById(pagoId).map(p -> p.getPedido() != null ? p.getPedido().getEmpresaId() : null).orElse(null);
            auditoria.registrarSiAdmin("PAGO_REINTEGRADO", "PAGO", pagoId, empresaId,
                notaLimpia == null ? "Reintegrado" : "Reintegrado: " + notaLimpia);
            return Resultado.MARCADO;
        }
        Optional<Pago> p = pagoRepository.findById(pagoId);
        if (p.isPresent() && Pago.REINTEGRO_HECHO.equals(p.get().getReintegroEstado())) return Resultado.YA_REINTEGRADO;
        return Resultado.NO_APLICA;
    }

    /** Marca todos los cobros pendientes de un negocio. Devuelve cuántos cambiaron. */
    @Transactional
    public int marcarReintegradoNegocio(Long empresaId, String actor, String nota) {
        int n = 0;
        for (Long id : pagoRepository.idsPendientesDeReintegroPorEmpresa(empresaId, Constants.PAGO_CAPTURADO)) {
            if (marcarReintegrado(id, actor, nota) == Resultado.MARCADO) n++;
        }
        return n;
    }

    static String limpiarNota(String nota) {
        if (nota == null || nota.isBlank()) return null;
        String n = nota.replaceAll("[\\r\\n]+", " ").trim();
        return n.length() > MAX_NOTA ? n.substring(0, MAX_NOTA) : n;
    }

    private static String actorSeguro(String actor) {
        String a = actor == null || actor.isBlank() ? "admin" : actor.trim();
        return a.length() > 120 ? a.substring(0, 120) : a;
    }
}

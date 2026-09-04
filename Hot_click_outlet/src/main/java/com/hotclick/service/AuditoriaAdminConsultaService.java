package com.hotclick.service;

import com.hotclick.dto.AuditoriaAdminDto;
import com.hotclick.model.AuditoriaAdmin;
import com.hotclick.model.Empresa;
import com.hotclick.repository.AuditoriaAdminRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Consulta de solo lectura sobre hot_click_auditoria_admin_tb.
 * Respeta retención de {@link Constants#DIAS_RETENCION_AUDITORIA_ADMIN} días.
 */
@Service
public class AuditoriaAdminConsultaService {

    private static final int TAMANO_MAX = 100;

    private final AuditoriaAdminRepository auditoriaRepo;
    private final EmpresaRepository empresaRepo;

    public AuditoriaAdminConsultaService(
            AuditoriaAdminRepository auditoriaRepo,
            EmpresaRepository empresaRepo) {
        this.auditoriaRepo = auditoriaRepo;
        this.empresaRepo = empresaRepo;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listar(
            String accion,
            String adminEmail,
            Long empresaId,
            LocalDate desdeFecha,
            LocalDate hastaFecha,
            int page,
            int size) {
        size = Math.min(Math.max(size, 1), TAMANO_MAX);
        page = Math.max(page, 0);

        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        LocalDateTime limiteRetencion = ahora.minusDays(Constants.DIAS_RETENCION_AUDITORIA_ADMIN);
        LocalDateTime desde = resolverDesde(desdeFecha, limiteRetencion);
        LocalDateTime hasta = resolverHasta(hastaFecha, ahora);
        if (desde.isAfter(hasta)) {
            desde = limiteRetencion;
        }

        String accionFiltro = blankToNull(accion);
        String emailFiltro = blankToNull(adminEmail);

        Page<AuditoriaAdmin> result = auditoriaRepo.buscar(
                accionFiltro,
                emailFiltro,
                empresaId,
                desde,
                hasta,
                PageRequest.of(page, size));

        Map<Long, String> nombres = nombresEmpresa(result.getContent());
        List<AuditoriaAdminDto> content = result.getContent().stream()
                .map(a -> toDto(a, nombres))
                .toList();

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("content", content);
        resp.put("totalElements", result.getTotalElements());
        resp.put("totalPages", result.getTotalPages());
        resp.put("page", result.getNumber());
        resp.put("size", result.getSize());
        resp.put("diasRetencion", Constants.DIAS_RETENCION_AUDITORIA_ADMIN);
        resp.put("desdeEfectivo", desde.toString());
        resp.put("hastaEfectivo", hasta.toString());
        return resp;
    }

    @Transactional(readOnly = true)
    public List<String> tiposEvento() {
        return auditoriaRepo.findDistinctAcciones();
    }

    static LocalDateTime resolverDesde(LocalDate desdeFecha, LocalDateTime limiteRetencion) {
        if (desdeFecha == null) {
            return limiteRetencion;
        }
        LocalDateTime pedido = desdeFecha.atStartOfDay();
        return pedido.isBefore(limiteRetencion) ? limiteRetencion : pedido;
    }

    static LocalDateTime resolverHasta(LocalDate hastaFecha, LocalDateTime ahora) {
        if (hastaFecha == null) {
            return ahora;
        }
        LocalDateTime pedido = hastaFecha.atTime(LocalTime.MAX);
        return pedido.isAfter(ahora) ? ahora : pedido;
    }

    private Map<Long, String> nombresEmpresa(List<AuditoriaAdmin> filas) {
        Set<Long> ids = filas.stream()
                .map(AuditoriaAdmin::getEmpresaId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> out = new HashMap<>();
        for (Empresa e : empresaRepo.findAllById(ids)) {
            String nombre = e.getNombreComercial() != null && !e.getNombreComercial().isBlank()
                    ? e.getNombreComercial()
                    : e.getNombreEmpresa();
            out.put(e.getId(), nombre);
        }
        return out;
    }

    private static AuditoriaAdminDto toDto(AuditoriaAdmin a, Map<Long, String> nombres) {
        String nombreEmpresa = a.getEmpresaId() == null ? null : nombres.get(a.getEmpresaId());
        return new AuditoriaAdminDto(
                a.getId(),
                a.getAdminId(),
                a.getAdminEmail(),
                a.getAccion(),
                a.getEntidad(),
                a.getEntidadId(),
                a.getDetalle(),
                a.getFecha(),
                a.getEmpresaId(),
                nombreEmpresa);
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}

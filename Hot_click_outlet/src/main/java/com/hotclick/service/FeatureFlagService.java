package com.hotclick.service;

import com.hotclick.repository.FeatureFlagRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class FeatureFlagService {

    private static final Logger log = LoggerFactory.getLogger(FeatureFlagService.class);

    private final FeatureFlagRepository flagRepo;
    private final JdbcTemplate jdbc;

    public FeatureFlagService(FeatureFlagRepository flagRepo, JdbcTemplate jdbc) {
        this.flagRepo = flagRepo;
        this.jdbc     = jdbc;
    }

    /**
     * Retorna los nombres de flags activos para la empresa.
     * Cacheado 60s por empresaId — consistencia eventual en multi-pod.
     * Al hacer toggle se evicta la entrada para ese empresaId.
     */
    @Cacheable(value = "empresaFlags", key = "#empresaId")
    @Transactional(readOnly = true)
    public Set<String> getFlagsActivosParaEmpresa(Long empresaId) {
        List<String> nombres = flagRepo.findNombresActivosParaEmpresa(empresaId);
        return new HashSet<>(nombres);
    }

    /**
     * Verifica si un flag específico está activo para una empresa.
     * Usa el cache de getFlagsActivosParaEmpresa.
     */
    public boolean isEnabled(String flagNombre, Long empresaId) {
        if (empresaId == null) return false;
        return getFlagsActivosParaEmpresa(empresaId).contains(flagNombre);
    }

    /**
     * Activa un flag para una empresa (upsert).
     * Evicta el cache del empresaId para que el próximo request vea el valor actual.
     */
    @CacheEvict(value = "empresaFlags", key = "#empresaId")
    @Transactional
    public void activar(Long empresaId, String flagNombre, String fechaExpIso) {
        Long flagId = getFlagId(flagNombre);
        jdbc.update("""
            INSERT INTO hot_click_empresa_feature_tb (fk_id_empresa, fk_id_flag, activo, fecha_exp)
            VALUES (?, ?, true, ?::TIMESTAMP)
            ON CONFLICT (fk_id_empresa, fk_id_flag)
            DO UPDATE SET activo = true, fecha_exp = EXCLUDED.fecha_exp
            """,
            empresaId, flagId,
            fechaExpIso != null && !fechaExpIso.isBlank() ? fechaExpIso : null
        );
        log.info("[feature-flag] ACTIVADO flag='{}' empresa={}", flagNombre, empresaId);
    }

    /**
     * Desactiva un flag para una empresa.
     */
    @CacheEvict(value = "empresaFlags", key = "#empresaId")
    @Transactional
    public void desactivar(Long empresaId, String flagNombre) {
        Long flagId = getFlagId(flagNombre);
        jdbc.update("""
            INSERT INTO hot_click_empresa_feature_tb (fk_id_empresa, fk_id_flag, activo)
            VALUES (?, ?, false)
            ON CONFLICT (fk_id_empresa, fk_id_flag)
            DO UPDATE SET activo = false, fecha_exp = NULL
            """,
            empresaId, flagId
        );
        log.info("[feature-flag] DESACTIVADO flag='{}' empresa={}", flagNombre, empresaId);
    }

    /**
     * Estado de todos los flags para una empresa (para el panel ADMIN_IT).
     * No cacheado — solo se llama desde el panel de gestión.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getEstadoFlags(Long empresaId) {
        List<Object[]> rows = flagRepo.findEstadoFlagsParaEmpresa(empresaId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",           row[0]);
            m.put("nombre",       row[1]);
            m.put("descripcion",  row[2]);
            m.put("activo",       row[3]);
            m.put("fechaExp",     row[4]);
            m.put("tieneOverride", row[5]);
            result.add(m);
        }
        return result;
    }

    /**
     * Lista todos los flags del registro (para ADMIN_IT).
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarTodos() {
        return flagRepo.findAllByOrderByNombreAsc().stream()
            .map(f -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",          f.getId());
                m.put("nombre",      f.getNombre());
                m.put("descripcion", f.getDescripcion());
                m.put("activoDefecto", f.getActivoDefecto());
                return m;
            }).toList();
    }

    private Long getFlagId(String nombre) {
        return flagRepo.findByNombre(nombre)
            .orElseThrow(() -> new NoSuchElementException("Feature flag no encontrado: " + nombre))
            .getId();
    }
}

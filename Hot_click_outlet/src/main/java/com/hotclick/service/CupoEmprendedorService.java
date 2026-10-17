package com.hotclick.service;

import com.hotclick.dto.CupoEmprendedorEstado;
import com.hotclick.dto.ResultadoAltaCupo;
import com.hotclick.model.Empresa;
import com.hotclick.repository.PlanRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.OptionalInt;

@Service
public class CupoEmprendedorService {

    private static final Logger log = LoggerFactory.getLogger(CupoEmprendedorService.class);
    private static final String SQL_ESTADO =
        "SELECT usados, limite FROM hot_click_cupo_emprendedor_tb WHERE id = 1";
    /** Atómico en cualquier motor: el UPDATE condicional toma el lock de la fila; 1 fila = cupo reservado. */
    private static final String SQL_RESERVAR =
        "UPDATE hot_click_cupo_emprendedor_tb SET usados = usados + 1 "
            + "WHERE id = 1 AND usados < limite";

    private final JdbcTemplate jdbcTemplate;
    private final PlanRepository planRepository;

    public CupoEmprendedorService(JdbcTemplate jdbcTemplate, PlanRepository planRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.planRepository = planRepository;
    }

    public CupoEmprendedorEstado estadoPublico() {
        try {
            CupoEmprendedorEstado leido = jdbcTemplate.queryForObject(SQL_ESTADO, (rs, rowNum) ->
                CupoEmprendedorEstado.of(rs.getInt("usados"), rs.getInt("limite")));
            return leido != null ? leido : cupoCerrado();
        } catch (DataAccessException ex) {
            log.warn("[cupo-emprendedor] no se pudo leer el cupo — {}", ex.getMessage());
            return cupoCerrado();
        }
    }

    private static CupoEmprendedorEstado cupoCerrado() {
        return CupoEmprendedorEstado.of(
            Constants.CUPO_EMPRENDEDORES_GRATIS, Constants.CUPO_EMPRENDEDORES_GRATIS);
    }

    public ResultadoAltaCupo aplicarAlta(Empresa empresa, String correoEmpresa) {
        if (esDemo(correoEmpresa)) {
            aplicarPlanGratis(empresa);
            return ResultadoAltaCupo.demo(estadoPublico());
        }
        OptionalInt reservado = reservarCupoGratis();
        if (reservado.isPresent()) {
            aplicarPlanGratis(empresa);
            return ResultadoAltaCupo.gratis(estadoPublico());
        }
        // Sin cupo: Emprendedor puede tener mensualidad (12-oct-2026), pero el monto lo fija HOT_CLICK.
        // Mientras esté vacío no hay nada que cobrar y el negocio entra igual que con cupo.
        if (mensualidadSinCupo().isEmpty()) {
            aplicarPlanGratis(empresa);
            return ResultadoAltaCupo.gratis(estadoPublico());
        }
        aplicarRequiereMembresia(empresa);
        return ResultadoAltaCupo.pago(estadoPublico());
    }

    @org.springframework.beans.factory.annotation.Value("${hotclick.planes.emprendedor.mensualidad-desde-cupo-crc:}")
    private String mensualidadDesdeCupo = "";

    /** Mensualidad de Emprendedor para negocios sin cupo; vacía = HOT_CLICK aún no la fijó (no se cobra). */
    public OptionalInt mensualidadSinCupo() {
        String v = mensualidadDesdeCupo == null ? "" : mensualidadDesdeCupo.trim();
        if (v.isEmpty()) return OptionalInt.empty();
        try {
            int n = Integer.parseInt(v);
            return n > 0 ? OptionalInt.of(n) : OptionalInt.empty();
        } catch (NumberFormatException e) {
            return OptionalInt.empty();
        }
    }

    public static boolean esDemo(String correoEmpresa) {
        if (correoEmpresa == null) return false;
        return correoEmpresa.toLowerCase().endsWith(Constants.CORREO_DEMO_EMPRESA_SUFIJO);
    }

    OptionalInt reservarCupoGratis() {
        try {
            int filas = jdbcTemplate.update(SQL_RESERVAR);
            if (filas != 1) return OptionalInt.empty();
            Integer usados = jdbcTemplate.queryForObject(
                "SELECT usados FROM hot_click_cupo_emprendedor_tb WHERE id = 1", Integer.class);
            return OptionalInt.of(usados == null ? 0 : usados);
        } catch (DataAccessException ex) {
            log.warn("[cupo-emprendedor] no se pudo reservar cupo — {}", ex.getMessage());
            return OptionalInt.empty();
        }
    }

    private void aplicarPlanGratis(Empresa empresa) {
        planRepository.findByNombre("EMPRENDEDOR").ifPresent(empresa::setPlan);
        empresa.setPlanSaas("EMPRENDEDOR");
        empresa.setEstadoPlan("ACTIVO");
    }

    private void aplicarRequiereMembresia(Empresa empresa) {
        planRepository.findByNombre("EMPRENDEDOR").ifPresent(empresa::setPlan);
        empresa.setPlanSaas("EMPRENDEDOR");
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        empresa.setVisibilidadPublica(false);
    }
}

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
    private static final String SQL_RESERVAR =
        "UPDATE hot_click_cupo_emprendedor_tb SET usados = usados + 1 "
            + "WHERE id = 1 AND usados < limite RETURNING usados";

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
        aplicarRequiereMembresia(empresa);
        return ResultadoAltaCupo.pago(estadoPublico());
    }

    public static boolean esDemo(String correoEmpresa) {
        if (correoEmpresa == null) return false;
        return correoEmpresa.toLowerCase().endsWith(Constants.CORREO_DEMO_EMPRESA_SUFIJO);
    }

    OptionalInt reservarCupoGratis() {
        try {
            List<Integer> filas = jdbcTemplate.query(
                SQL_RESERVAR, (rs, rowNum) -> rs.getInt("usados"));
            if (filas.isEmpty()) return OptionalInt.empty();
            return OptionalInt.of(filas.get(0));
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

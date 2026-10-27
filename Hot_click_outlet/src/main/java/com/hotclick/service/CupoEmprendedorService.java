package com.hotclick.service;

import com.hotclick.dto.CupoEmprendedorEstado;
import com.hotclick.dto.ResultadoAltaCupo;
import com.hotclick.model.Empresa;
import com.hotclick.repository.PlanRepository;
import com.hotclick.service.suscripcion.TrialEmprendedorConfig;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Locale;
import java.util.OptionalInt;

@Service
public class CupoEmprendedorService {

    private static final Logger log = LoggerFactory.getLogger(CupoEmprendedorService.class);
    private static final String SQL_ESTADO =
        "SELECT usados, limite FROM hot_click_cupo_emprendedor_tb WHERE id = 1";
    private static final String SQL_POSICION =
        "SELECT usados FROM hot_click_cupo_emprendedor_tb WHERE id = 1";
    /**
     * Contador atómico y portable (PostgreSQL y H2): un único UPDATE condicionado. La fila queda bloqueada hasta el
     * commit, así que dos altas simultáneas se serializan y la 71.ª (o la N+1 del cupo configurado) afecta 0 filas.
     * El tope sale de {@code hotclick.trial-emprendedor.cupo}, no de código.
     */
    private static final String SQL_RESERVAR =
        "UPDATE hot_click_cupo_emprendedor_tb SET usados = usados + 1, limite = ? "
            + "WHERE id = 1 AND usados < ?";

    private final JdbcTemplate jdbcTemplate;
    private final PlanRepository planRepository;
    private final TrialEmprendedorConfig trialConfig;

    public CupoEmprendedorService(JdbcTemplate jdbcTemplate, PlanRepository planRepository,
                                  TrialEmprendedorConfig trialConfig) {
        this.jdbcTemplate = jdbcTemplate;
        this.planRepository = planRepository;
        this.trialConfig = trialConfig;
    }

    public CupoEmprendedorEstado estadoPublico() {
        try {
            CupoEmprendedorEstado leido = jdbcTemplate.queryForObject(SQL_ESTADO, (rs, rowNum) ->
                CupoEmprendedorEstado.of(rs.getInt("usados"), trialConfig.cupo()));
            return leido != null ? leido : cupoCerrado();
        } catch (DataAccessException ex) {
            log.warn("[cupo-emprendedor] no se pudo leer el cupo — {}", ex.getMessage());
            return cupoCerrado();
        }
    }

    private CupoEmprendedorEstado cupoCerrado() {
        return CupoEmprendedorEstado.of(trialConfig.cupo(), trialConfig.cupo());
    }

    /**
     * Alta de un negocio Emprendedor. Los primeros {@code hotclick.trial-emprendedor.cupo} (70) reciben un trial de
     * {@code hotclick.trial-emprendedor.dias} (90) días; pasado el trial la mensualidad US$9 se cobra automática por
     * ONVO. Sin cupo (el 71 en adelante) nunca hay trial: queda REQUIERE_MEMBRESIA, no visible, hasta pagar.
     * Se une a la transacción del llamador: si el alta falla después, el puesto se devuelve con el rollback.
     */
    @Transactional
    public ResultadoAltaCupo aplicarAlta(Empresa empresa, String correoEmpresa) {
        if (esDemo(correoEmpresa)) {
            aplicarPlanGratis(empresa);
            return ResultadoAltaCupo.demo(estadoPublico());
        }
        OptionalInt reservado = reservarCupoGratis();
        if (reservado.isPresent()) {
            aplicarTrial(empresa, reservado.getAsInt());
            return ResultadoAltaCupo.gratis(estadoPublico());
        }
        // Fail-closed: sin cupo (o sin poder confirmarlo) nunca entra con trial.
        aplicarRequiereMembresia(empresa);
        return ResultadoAltaCupo.pago(estadoPublico());
    }

    public static boolean esDemo(String correoEmpresa) {
        if (correoEmpresa == null) return false;
        return correoEmpresa.toLowerCase(Locale.ROOT).endsWith(Constants.CORREO_DEMO_EMPRESA_SUFIJO);
    }

    /**
     * Reserva un puesto de trial. Devuelve el puesto (1..cupo) o vacío si el cupo está lleno, es 0, o la BD falló
     * (fail-closed: ante la duda no se regala trial).
     */
    OptionalInt reservarCupoGratis() {
        try {
            int cupo = trialConfig.cupo();
            int filas = jdbcTemplate.update(SQL_RESERVAR, cupo, cupo);
            if (filas != 1) return OptionalInt.empty();
            Integer pos = jdbcTemplate.queryForObject(SQL_POSICION, Integer.class);
            return pos == null ? OptionalInt.empty() : OptionalInt.of(pos);
        } catch (DataAccessException ex) {
            log.warn("[cupo-emprendedor] no se pudo reservar cupo — {}", ex.getMessage());
            return OptionalInt.empty();
        }
    }

    private void aplicarTrial(Empresa empresa, int posicion) {
        planRepository.findByNombre("EMPRENDEDOR").ifPresent(empresa::setPlan);
        empresa.setPlanSaas("EMPRENDEDOR");
        LocalDate fin = LocalDate.now(Constants.ZONA_CR).plusDays(trialConfig.dias());
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_TRIAL);
        empresa.setTrialHasta(fin);
        empresa.setFechaVencPlan(fin);
        empresa.setTrialEmprendedorHasta(fin);
        empresa.setTrialEmprendedorPos(posicion);
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

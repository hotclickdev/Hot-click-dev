package com.hotclick.service;

import com.hotclick.dto.CupoEmprendedorEstado;
import com.hotclick.dto.ResultadoAltaCupo;
import com.hotclick.model.Empresa;
import com.hotclick.exception.CupoEmprendedorNoDisponibleException;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.suscripcion.TrialEmprendedorConfig;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Locale;

@Service
public class CupoEmprendedorService {

    private static final Logger log = LoggerFactory.getLogger(CupoEmprendedorService.class);
    private static final String SQL_ESTADO =
        "SELECT usados, limite FROM hot_click_cupo_emprendedor_tb WHERE id = 1";
    /** Toma el lock de la fila del contador sin cambiarla: serializa reservas, liberaciones y chequeo de persona. */
    private static final String SQL_BLOQUEAR =
        "UPDATE hot_click_cupo_emprendedor_tb SET usados = usados WHERE id = 1";
    private static final String SQL_TITULAR_EXISTENTE =
        "SELECT COUNT(*) FROM hot_click_empresa_tb WHERE id_empresa <> ? "
            + "AND (trial_emprendedor_titular_usuario = ? OR trial_emprendedor_titular_correo = ?)";
    /** Menor puesto 1.. que nadie ocupa (los puestos liberados se reutilizan; el índice UNIQUE de V206 sigue valiendo). */
    private static final String SQL_PRIMER_PUESTO_LIBRE =
        "SELECT MIN(c.n) FROM (SELECT 1 AS n UNION ALL SELECT trial_emprendedor_pos + 1 FROM hot_click_empresa_tb "
            + "WHERE trial_emprendedor_pos IS NOT NULL) c "
            + "WHERE NOT EXISTS (SELECT 1 FROM hot_click_empresa_tb e WHERE e.trial_emprendedor_pos = c.n)";
    private static final String SQL_ASIGNAR =
        "UPDATE hot_click_empresa_tb SET trial_emprendedor_pos = ?, trial_emprendedor_titular_usuario = ?, "
            + "trial_emprendedor_titular_correo = ? WHERE id_empresa = ?";
    private static final String SQL_LIBERAR_EMPRESA =
        "UPDATE hot_click_empresa_tb SET trial_emprendedor_pos = NULL, trial_emprendedor_titular_usuario = NULL, "
            + "trial_emprendedor_titular_correo = NULL, trial_emprendedor_hasta = NULL, trial_hasta = NULL, "
            + "fecha_venc_plan = NULL, estado_plan = 'PENDIENTE_CUPO', visibilidad_publica = FALSE "
            + "WHERE id_empresa = ? AND trial_emprendedor_pos IS NOT NULL AND estado_plan IN ('TRIAL', 'PENDIENTE_CUPO')";
    private static final String SQL_DEVOLVER =
        "UPDATE hot_click_cupo_emprendedor_tb SET usados = usados - 1 WHERE id = 1 AND usados > 0";
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
    private final SuscripcionRepository suscripcionRepository;
    private final Environment environment;
    private final boolean demoCorreoHabilitado;

    /**
     * @param demoCorreoHabilitado {@code hotclick.cupo-emprendedor.demo-correo-habilitado}: por defecto {@code false}.
     *        Solo se respeta con perfil dev o test (y nunca con prod/production); ver {@link #esDemo(String)}.
     */
    public CupoEmprendedorService(JdbcTemplate jdbcTemplate, PlanRepository planRepository,
                                  TrialEmprendedorConfig trialConfig, SuscripcionRepository suscripcionRepository,
                                  Environment environment,
                                  @Value("${hotclick.cupo-emprendedor.demo-correo-habilitado:false}") boolean demoCorreoHabilitado) {
        this.jdbcTemplate = jdbcTemplate;
        this.planRepository = planRepository;
        this.trialConfig = trialConfig;
        this.suscripcionRepository = suscripcionRepository;
        this.environment = environment;
        this.demoCorreoHabilitado = demoCorreoHabilitado;
    }

    public CupoEmprendedorEstado estadoPublico() {
        try {
            CupoEmprendedorEstado leido = jdbcTemplate.queryForObject(SQL_ESTADO, (rs, rowNum) ->
                CupoEmprendedorEstado.of(rs.getInt("usados"), trialConfig.cupo(), trialConfig.periodoGratis()));
            return leido != null ? leido : cupoCerrado();
        } catch (DataAccessException ex) {
            log.warn("[cupo-emprendedor] no se pudo leer el cupo — {}", ex.getMessage());
            return cupoCerrado();
        }
    }

    private CupoEmprendedorEstado cupoCerrado() {
        return CupoEmprendedorEstado.of(trialConfig.cupo(), trialConfig.cupo(), trialConfig.periodoGratis());
    }

    /**
     * Alta de un negocio Emprendedor. Desde V207 el registro NO toma puesto ni arranca el trial: un negocio real queda
     * PENDIENTE_CUPO (plan Emprendedor, oculto) y el puesto, los {@code hotclick.trial-emprendedor.dias} días de trial
     * y el trial de ONVO cuentan desde que HotClick lo aprueba, con correo del propietario verificado y un puesto por
     * persona ({@code CupoEmprendedorAprobacionService}). Así un negocio pendiente (o falso) no agota el cupo.
     * Las cuentas demo (@hotclick.test) van en plan gratis sin cupo SOLO en dev/test con el flag explícito
     * ({@link #esDemo(String)}); en cualquier otro perfil siguen la ruta normal.
     */
    @Transactional
    public ResultadoAltaCupo aplicarAlta(Empresa empresa, String correoEmpresa) {
        if (esDemo(correoEmpresa)) {
            aplicarPlanGratis(empresa);
            return ResultadoAltaCupo.demo(estadoPublico());
        }
        aplicarPendienteCupo(empresa);
        return ResultadoAltaCupo.pendiente(estadoPublico());
    }

    /**
     * Cuenta demo (plan gratis, sin puesto ni correo verificado). El correo lo escribe quien se registra, así que el
     * sufijo por sí solo NUNCA basta: hace falta el flag {@code hotclick.cupo-emprendedor.demo-correo-habilitado=true}
     * Y un perfil dev o test activo Y ningún perfil prod/production. Sin entorno, sin flag o con cualquier otro perfil
     * (staging, prod, sin perfil…) devuelve false: fail-closed.
     */
    public boolean esDemo(String correoEmpresa) {
        if (correoEmpresa == null || !demoCorreoHabilitado || !perfilDemoPermitido()) return false;
        return correoEmpresa.trim().toLowerCase(Locale.ROOT).endsWith(Constants.CORREO_DEMO_EMPRESA_SUFIJO);
    }

    private boolean perfilDemoPermitido() {
        if (environment == null) return false;
        for (String p : environment.getActiveProfiles()) {
            String n = p == null ? "" : p.trim().toLowerCase(Locale.ROOT);
            if (n.equals("prod") || n.equals("production")) return false;
        }
        return environment.acceptsProfiles(Profiles.of("(dev | test) & !prod & !production"));
    }

    /** Resultado de pedir un puesto de trial para un titular. */
    public enum ResultadoReserva {
        ASIGNADO, SIN_CUPO, PERSONA_YA_TIENE_PUESTO,
        /** La persona ya tiene otro puesto, pero este negocio trae uno con suscripción vigente: no se toca. */
        PUESTO_CONSERVADO_CON_SUSCRIPCION
    }

    /**
     * Asigna un puesto de trial a la empresa para un titular (usuario propietario + correo normalizado). DEBE correr
     * dentro de la transacción del llamador y con la fila de la empresa ya bloqueada.
     *
     * <p>Concurrencia: lo primero es tomar el lock de la fila única del contador (un UPDATE). Todas las reservas y
     * liberaciones pasan por ese lock, así que "¿esta persona ya tiene puesto?" y "¿queda cupo?" se evalúan en serie
     * y dos negocios de la misma persona aprobados a la vez nunca obtienen dos puestos. El UNIQUE de V207 es la red
     * de seguridad (en PostgreSQL una violación abortaría la transacción, por eso no se usa como control principal).
     *
     * <p>Si la empresa ya traía un puesto del registro anterior (#411, sin titular), no se vuelve a descontar: solo se
     * le asigna titular, o se libera si la persona ya tenía otro. Si ese puesto heredado tiene una suscripción vigente
     * (cobro ONVO creado) NO se libera: devuelve {@link ResultadoReserva#PUESTO_CONSERVADO_CON_SUSCRIPCION} y el
     * negocio queda como está (es del flujo de pagos).
     *
     * @throws CupoEmprendedorNoDisponibleException si la base de datos falla: la transacción puede quedar abortada
     *         (PostgreSQL), así que no se sigue como si fuera «sin cupo»; se revierte todo y se responde 409.
     */
    @Transactional
    public ResultadoReserva reservarPuesto(Empresa empresa, Long usuarioId, String correoClave) {
        try {
            if (jdbcTemplate.update(SQL_BLOQUEAR) != 1) return ResultadoReserva.SIN_CUPO;
            boolean yaTrajoPuesto = empresa.getTrialEmprendedorPos() != null;
            Integer otros = jdbcTemplate.queryForObject(SQL_TITULAR_EXISTENTE, Integer.class,
                empresa.getId(), usuarioId, correoClave);
            if (otros != null && otros > 0) {
                if (yaTrajoPuesto) {
                    if (suscripcionRepository.findActivaByEmpresaId(empresa.getId()).isPresent()) {
                        log.warn("[cupo-emprendedor] empresa={} con suscripción vigente: el puesto heredado no se libera",
                            empresa.getId());
                        return ResultadoReserva.PUESTO_CONSERVADO_CON_SUSCRIPCION;
                    }
                    liberarPuesto(empresa);
                }
                return ResultadoReserva.PERSONA_YA_TIENE_PUESTO;
            }
            int posicion;
            if (yaTrajoPuesto) {
                posicion = empresa.getTrialEmprendedorPos();
            } else {
                int cupo = trialConfig.cupo();
                if (jdbcTemplate.update(SQL_RESERVAR, cupo, cupo) != 1) return ResultadoReserva.SIN_CUPO;
                Integer libre = jdbcTemplate.queryForObject(SQL_PRIMER_PUESTO_LIBRE, Integer.class);
                if (libre == null) throw new IllegalStateException("sin puesto libre calculable");
                posicion = libre;
            }
            int filas = jdbcTemplate.update(SQL_ASIGNAR, posicion, usuarioId, correoClave, empresa.getId());
            if (filas != 1) throw new IllegalStateException("no se pudo asignar el puesto a la empresa " + empresa.getId());
            empresa.setTrialEmprendedorPos(posicion);
            empresa.setTrialEmprendedorTitularUsuario(usuarioId);
            empresa.setTrialEmprendedorTitularCorreo(correoClave);
            return ResultadoReserva.ASIGNADO;
        } catch (DataAccessException ex) {
            // Solo el tipo: el mensaje de un UNIQUE/FK puede traer el correo del titular (PII).
            log.warn("[cupo-emprendedor] no se pudo reservar cupo — {}", ex.getClass().getSimpleName());
            throw new CupoEmprendedorNoDisponibleException();
        }
    }

    /**
     * Libera el puesto de la empresa (rechazo): el {@code UPDATE} condicionado a "tiene puesto" y "sigue sin pagar" es
     * la guarda contra la doble liberación (el segundo intento afecta 0 filas y no toca el contador) y el contador
     * baja con {@code usados > 0}, así que nunca queda negativo. Devuelve true si liberó.
     */
    @Transactional
    public boolean liberarPuesto(Empresa empresa) {
        if (empresa == null || empresa.getId() == null) return false;
        int filas = jdbcTemplate.update(SQL_LIBERAR_EMPRESA, empresa.getId());
        if (filas != 1) return false;
        jdbcTemplate.update(SQL_DEVOLVER);
        empresa.setTrialEmprendedorPos(null);
        empresa.setTrialEmprendedorTitularUsuario(null);
        empresa.setTrialEmprendedorTitularCorreo(null);
        empresa.setTrialEmprendedorHasta(null);
        empresa.setTrialHasta(null);
        empresa.setFechaVencPlan(null);
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
        empresa.setVisibilidadPublica(false);
        return true;
    }

    /** Pasa la empresa a TRIAL con los días contados desde hoy (el día de la aprobación). */
    public void aplicarTrial(Empresa empresa) {
        planRepository.findByNombre("EMPRENDEDOR").ifPresent(empresa::setPlan);
        empresa.setPlanSaas("EMPRENDEDOR");
        LocalDate fin = LocalDate.now(Constants.ZONA_CR).plusDays(trialConfig.dias());
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_TRIAL);
        empresa.setTrialHasta(fin);
        empresa.setFechaVencPlan(fin);
        empresa.setTrialEmprendedorHasta(fin);
    }

    /** Sin puesto (cupo lleno o la persona ya tiene uno): nunca trial, queda a la espera de pagar. */
    public void aplicarRequiereMembresia(Empresa empresa) {
        planRepository.findByNombre("EMPRENDEDOR").ifPresent(empresa::setPlan);
        empresa.setPlanSaas("EMPRENDEDOR");
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        empresa.setVisibilidadPublica(false);
    }

    private void aplicarPendienteCupo(Empresa empresa) {
        planRepository.findByNombre("EMPRENDEDOR").ifPresent(empresa::setPlan);
        empresa.setPlanSaas("EMPRENDEDOR");
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
        empresa.setVisibilidadPublica(false);
    }

    private void aplicarPlanGratis(Empresa empresa) {
        planRepository.findByNombre("EMPRENDEDOR").ifPresent(empresa::setPlan);
        empresa.setPlanSaas("EMPRENDEDOR");
        empresa.setEstadoPlan("ACTIVO");
    }
}

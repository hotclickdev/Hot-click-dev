package com.hotclick.service;

import com.hotclick.exception.CupoEmprendedorCorreoNoVerificadoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Suscripcion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.CupoEmprendedorAprobacionService.Resultado;
import com.hotclick.service.suscripcion.TrialEmprendedorConfig;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Puesto y trial al APROBAR (no al registrar), con correo verificado obligatorio y un puesto por persona. El contador
 * es real (H2 en modo PostgreSQL); solo los repositorios de JPA están simulados.
 */
@DisplayName("Cupo Emprendedor al aprobar: correo verificado, trial desde la aprobación y rechazo")
class CupoEmprendedorAprobacionServiceTest {

    private JdbcTemplate jdbc;
    private TransactionTemplate tx;
    private CupoEmprendedorService cupo;
    private MiembroEmpresaRepository miembros;
    private UsuarioRepository usuarios;
    private SuscripcionRepository suscripciones;
    private CupoEmprendedorAprobacionService servicio;

    @BeforeEach
    void setUp() {
        DriverManagerDataSource ds = new DriverManagerDataSource(
            "jdbc:h2:mem:aprob_" + System.nanoTime() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=20000", "sa", "");
        jdbc = new JdbcTemplate(ds);
        tx = new TransactionTemplate(new DataSourceTransactionManager(ds));
        jdbc.execute("CREATE TABLE hot_click_cupo_emprendedor_tb (id SMALLINT PRIMARY KEY, "
            + "limite INTEGER NOT NULL DEFAULT 70, usados INTEGER NOT NULL DEFAULT 0)");
        jdbc.update("INSERT INTO hot_click_cupo_emprendedor_tb (id, limite, usados) VALUES (1, 70, 0)");
        jdbc.execute("CREATE TABLE hot_click_empresa_tb (id_empresa BIGINT PRIMARY KEY, "
            + "estado_plan VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE_CUPO', visibilidad_publica BOOLEAN NOT NULL DEFAULT FALSE, "
            + "trial_hasta DATE, fecha_venc_plan DATE, trial_emprendedor_hasta DATE, "
            + "trial_emprendedor_pos INTEGER, trial_emprendedor_titular_usuario BIGINT, "
            + "trial_emprendedor_titular_correo VARCHAR(160))");
        jdbc.execute("CREATE UNIQUE INDEX uq_pos ON hot_click_empresa_tb (trial_emprendedor_pos)");
        jdbc.execute("CREATE UNIQUE INDEX uq_tu ON hot_click_empresa_tb (trial_emprendedor_titular_usuario)");
        jdbc.execute("CREATE UNIQUE INDEX uq_tc ON hot_click_empresa_tb (trial_emprendedor_titular_correo)");

        PlanRepository planes = mock(PlanRepository.class);
        cupo = new CupoEmprendedorService(jdbc, planes, new TrialEmprendedorConfig(70, 90));
        miembros = mock(MiembroEmpresaRepository.class);
        usuarios = mock(UsuarioRepository.class);
        suscripciones = mock(SuscripcionRepository.class);
        when(suscripciones.findActivaByEmpresaId(anyLong())).thenReturn(Optional.empty());
        servicio = new CupoEmprendedorAprobacionService(cupo, miembros, usuarios, suscripciones);
    }

    @AfterEach
    void tearDown() {
        jdbc.execute("DROP ALL OBJECTS");
    }

    private int usados() {
        return jdbc.queryForObject("SELECT usados FROM hot_click_cupo_emprendedor_tb", Integer.class);
    }

    private Usuario usuario(long id, String correo, boolean verificado) {
        Usuario u = new Usuario();
        u.setId(id);
        u.setCorreo(correo);
        u.setCorreoVerificado(verificado);
        return u;
    }

    /** Empresa pendiente (como la deja el registro) cuyo propietario es {@code dueno}. */
    private Empresa pendiente(long id, Usuario dueno) {
        jdbc.update("INSERT INTO hot_click_empresa_tb (id_empresa) VALUES (?)", id);
        Empresa e = new Empresa();
        e.setId(id);
        e.setEstadoPlan(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
        MiembroEmpresa m = new MiembroEmpresa();
        m.setUsuario(dueno);
        m.setRolEnEmpresa("PROPIETARIO");
        when(miembros.findByEmpresaIdAndEstado(id, 1)).thenReturn(List.of(m));
        return e;
    }

    private boolean rechazar(Empresa e) {
        return Boolean.TRUE.equals(tx.execute(st -> servicio.liberarAlRechazar(e)));
    }

    private Resultado aprobar(Empresa e) {
        return tx.execute(st -> servicio.resolverAlAprobar(e));
    }

    @Test
    @DisplayName("Con el correo verificado, la aprobación asigna el puesto y el trial arranca HOY (la aprobación)")
    void aprobarAsignaPuestoYTrialDesdeHoy() {
        Empresa e = pendiente(1, usuario(10, "Dueno@Correo.com", true));
        assertThat(usados()).isZero(); // el registro no consumió nada

        assertThat(aprobar(e)).isEqualTo(Resultado.TRIAL_ASIGNADO);

        LocalDate esperado = LocalDate.now(Constants.ZONA_CR).plusDays(90);
        assertThat(usados()).isEqualTo(1);
        assertThat(e.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_TRIAL);
        assertThat(e.getTrialEmprendedorHasta()).isEqualTo(esperado);
        assertThat(e.getTrialHasta()).isEqualTo(esperado);
        assertThat(e.getTrialEmprendedorPos()).isEqualTo(1);
        assertThat(e.getTrialEmprendedorTitularUsuario()).isEqualTo(10L);
        assertThat(e.getTrialEmprendedorTitularCorreo()).isEqualTo("dueno@correo.com");
    }

    @Test
    @DisplayName("Correo sin verificar: la aprobación se rechaza con 409 y no consume puesto")
    void correoSinVerificarBloqueaYNoConsume() {
        Empresa e = pendiente(1, usuario(10, "dueno@correo.com", false));

        assertThatThrownBy(() -> aprobar(e)).isInstanceOf(CupoEmprendedorCorreoNoVerificadoException.class);

        assertThat(usados()).isZero();
        assertThat(e.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
        assertThat(e.getTrialEmprendedorPos()).isNull();
    }

    @Test
    @DisplayName("Correo verificado nulo (nunca verificó) también bloquea; sin propietario también")
    void correoNuloOSinPropietarioBloquea() {
        Usuario sinFlag = usuario(10, "dueno@correo.com", false);
        sinFlag.setCorreoVerificado(null);
        Empresa e1 = pendiente(1, sinFlag);
        assertThatThrownBy(() -> aprobar(e1)).isInstanceOf(CupoEmprendedorCorreoNoVerificadoException.class);

        jdbc.update("INSERT INTO hot_click_empresa_tb (id_empresa) VALUES (2)");
        Empresa e2 = new Empresa();
        e2.setId(2L);
        e2.setEstadoPlan(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
        when(miembros.findByEmpresaIdAndEstado(2L, 1)).thenReturn(List.of());
        when(usuarios.findByEmpresaIdConRoles(2L)).thenReturn(List.of());
        assertThatThrownBy(() -> aprobar(e2)).isInstanceOf(CupoEmprendedorCorreoNoVerificadoException.class);
        assertThat(usados()).isZero();
    }

    @Test
    @DisplayName("Una persona con 2 negocios pendientes: aprobar el segundo no le da otro puesto")
    void segundoNegocioDeLaMismaPersonaNoRecibePuesto() {
        Usuario dueno = usuario(10, "dueno@correo.com", true);
        Empresa a = pendiente(1, dueno), b = pendiente(2, dueno);

        assertThat(aprobar(a)).isEqualTo(Resultado.TRIAL_ASIGNADO);
        assertThat(aprobar(b)).isEqualTo(Resultado.REQUIERE_MEMBRESIA);

        assertThat(usados()).isEqualTo(1);
        assertThat(b.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        assertThat(b.getVisibilidadPublica()).isFalse();
        assertThat(b.getTrialEmprendedorHasta()).isNull();
    }

    @Test
    @DisplayName("Dos negocios de la misma persona aprobados a la vez: exactamente 1 trial (20 rondas)")
    void aprobacionSimultaneaMismaPersona() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            for (int ronda = 0; ronda < 20; ronda++) {
                Usuario dueno = usuario(100L + ronda, "d" + ronda + "@correo.com", true);
                Empresa a = pendiente(100L + ronda * 2, dueno), b = pendiente(101L + ronda * 2, dueno);
                CountDownLatch salida = new CountDownLatch(1);
                Callable<Resultado> ta = () -> { salida.await(); return aprobar(a); };
                Callable<Resultado> tb = () -> { salida.await(); return aprobar(b); };
                Future<Resultado> fa = pool.submit(ta), fb = pool.submit(tb);
                salida.countDown();
                assertThat(List.of(fa.get(60, TimeUnit.SECONDS), fb.get(60, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(Resultado.TRIAL_ASIGNADO, Resultado.REQUIERE_MEMBRESIA);
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(usados()).isEqualTo(20);
    }

    @Test
    @DisplayName("Cupo lleno: aprobada sin trial, oculta y con REQUIERE_MEMBRESIA")
    void cupoLlenoRequiereMembresia() {
        jdbc.update("UPDATE hot_click_cupo_emprendedor_tb SET usados = 70");
        Empresa e = pendiente(1, usuario(10, "dueno@correo.com", true));

        assertThat(aprobar(e)).isEqualTo(Resultado.REQUIERE_MEMBRESIA);

        assertThat(usados()).isEqualTo(70);
        assertThat(e.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        assertThat(e.getVisibilidadPublica()).isFalse();
    }

    @Test
    @DisplayName("Aprobar de nuevo una empresa ya resuelta no reinicia el trial ni consume más (NO_APLICA)")
    void aprobarDosVecesEsIdempotente() {
        Empresa e = pendiente(1, usuario(10, "dueno@correo.com", true));
        aprobar(e);
        LocalDate hasta = e.getTrialEmprendedorHasta();
        e.setTrialEmprendedorHasta(hasta.minusDays(30)); // simula que pasó el tiempo

        assertThat(aprobar(e)).isEqualTo(Resultado.NO_APLICA);

        assertThat(e.getTrialEmprendedorHasta()).isEqualTo(hasta.minusDays(30));
        assertThat(usados()).isEqualTo(1);
    }

    @Test
    @DisplayName("Rechazar un negocio con puesto lo libera y la misma persona puede volver a pedirlo")
    void rechazoLibera() {
        Usuario dueno = usuario(10, "dueno@correo.com", true);
        Empresa a = pendiente(1, dueno), b = pendiente(2, dueno);
        aprobar(a);
        assertThat(usados()).isEqualTo(1);

        assertThat(rechazar(a)).isTrue();

        assertThat(usados()).isZero();
        assertThat(a.getTrialEmprendedorPos()).isNull();
        assertThat(aprobar(b)).isEqualTo(Resultado.TRIAL_ASIGNADO);
        assertThat(usados()).isEqualTo(1);
    }

    @Test
    @DisplayName("Rechazar un negocio que nunca tuvo puesto (pendiente) no toca el contador; dos rechazos no liberan dos veces")
    void rechazoPendienteYDobleRechazoNoTocanContador() {
        Usuario otro = usuario(11, "otro@correo.com", true);
        Empresa conPuesto = pendiente(1, usuario(10, "dueno@correo.com", true));
        Empresa soloPendiente = pendiente(2, otro);
        aprobar(conPuesto);

        assertThat(rechazar(soloPendiente)).isFalse();
        assertThat(usados()).isEqualTo(1);

        assertThat(rechazar(conPuesto)).isTrue();
        assertThat(rechazar(conPuesto)).isFalse();
        assertThat(usados()).isZero();
    }

    @Test
    @DisplayName("Con suscripción ONVO vigente el rechazo no quita el puesto")
    void conSuscripcionVigenteNoLibera() {
        Empresa e = pendiente(1, usuario(10, "dueno@correo.com", true));
        aprobar(e);
        when(suscripciones.findActivaByEmpresaId(1L)).thenReturn(Optional.of(Mockito.mock(Suscripcion.class)));

        assertThat(rechazar(e)).isFalse();

        assertThat(usados()).isEqualTo(1);
        assertThat(e.getTrialEmprendedorPos()).isEqualTo(1);
    }

    @Test
    @DisplayName("Puesto del registro anterior (TRIAL con puesto y sin titular) recibe titular al aprobar, sin otro descuento")
    void puestoHeredadoRecibeTitular() {
        Empresa e = pendiente(1, usuario(10, "dueno@correo.com", true));
        jdbc.update("UPDATE hot_click_empresa_tb SET estado_plan = 'TRIAL', trial_emprendedor_pos = 1 WHERE id_empresa = 1");
        jdbc.update("UPDATE hot_click_cupo_emprendedor_tb SET usados = 1");
        e.setEstadoPlan(Constants.ESTADO_PLAN_TRIAL);
        e.setTrialEmprendedorPos(1);

        assertThat(aprobar(e)).isEqualTo(Resultado.TRIAL_ASIGNADO);

        assertThat(usados()).isEqualTo(1);
        assertThat(e.getTrialEmprendedorTitularUsuario()).isEqualTo(10L);
        assertThat(e.getTrialEmprendedorTitularCorreo()).isEqualTo("dueno@correo.com");
    }

    @Test
    @DisplayName("normalizarCorreo: minúsculas, sin +alias, y puntos/dominio de Gmail unificados")
    void normalizarCorreo() {
        assertThat(CupoEmprendedorAprobacionService.normalizarCorreo("  Ana.Perez+tienda@Gmail.com "))
            .isEqualTo("anaperez@gmail.com");
        assertThat(CupoEmprendedorAprobacionService.normalizarCorreo("ana.perez@googlemail.com"))
            .isEqualTo("anaperez@gmail.com");
        assertThat(CupoEmprendedorAprobacionService.normalizarCorreo("Ana.Perez+x@empresa.cr"))
            .isEqualTo("ana.perez@empresa.cr"); // fuera de Gmail los puntos sí cuentan
        assertThat(CupoEmprendedorAprobacionService.normalizarCorreo("sin-arroba")).isEqualTo("sin-arroba");
        assertThat(CupoEmprendedorAprobacionService.normalizarCorreo(null)).isNull();
    }
}

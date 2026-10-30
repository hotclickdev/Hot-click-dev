package com.hotclick.integration;

import com.hotclick.dto.ResultadoAltaCupo;
import com.hotclick.exception.CupoEmprendedorCorreoNoVerificadoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.BccrService;
import com.hotclick.service.CupoEmprendedorAprobacionService;
import com.hotclick.service.CupoEmprendedorAprobacionService.Resultado;
import com.hotclick.service.CupoEmprendedorService;
import com.hotclick.service.GeminiService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.ResendEmailService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.analytics.PostHogCaptureService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Arranque del contexto completo con perfil prod (más "test" para H2) y el flag de cuentas demo EN TRUE a propósito
 * (el peor caso: alguien lo dejó encendido). En prod un correo @hotclick.test, que escribe quien se registra, no
 * recibe plan gratis ni se salta puesto ni correo verificado: va por la ruta normal.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK, properties = {
    "hotclick.cupo-emprendedor.demo-correo-habilitado=true",
    "onvo.secret-key=onvo_test_ficticia_no_es_real",
    "payments.onvo.permitir-llave-test=true",
    // En prod la URL pública no puede ser localhost (UrlPublicaArranqueGuard); application-test.properties usa localhost.
    "app.url=https://hotclick.lat",
    // El guard de prod exige la config de billing (valores ficticios).
    "hotclick.planes.moneda=usd",
    "hotclick.planes.emprendedor.precio-mensual-usd=9",
    "hotclick.planes.pyme.precio-mensual-usd=24",
    "hotclick.planes.negocio-plus.precio-mensual-usd=49",
    "onvo.price-id.pyme=price_pyme_ficticio",
    "onvo.price-id.negocio-plus=price_plus_ficticio"
})
@ActiveProfiles({"test", "prod"})
@DisplayName("[Cupo Emprendedor] Perfil prod: @hotclick.test no recibe plan gratis ni se salta puesto/correo verificado")
class CupoEmprendedorDemoProdArranqueTest {

    private static final String CORREO_DEMO = "negocio.falso@hotclick.test";

    @MockitoBean ResendEmailService resendEmailService;
    @MockitoBean NotificacionEmailService notificacionEmailService;
    @MockitoBean SupabaseStorageService supabaseStorageService;
    @MockitoBean BccrService bccrService;
    @MockitoBean GeminiService geminiService;
    @MockitoBean PostHogCaptureService postHogCaptureService;

    @Autowired Environment environment;
    @Autowired CupoEmprendedorService cupoService;
    @Autowired CupoEmprendedorAprobacionService aprobacionService;
    @Autowired EmpresaRepository empresaRepository;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired RolRepository rolRepository;
    @Autowired MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        jdbc.execute("CREATE TABLE IF NOT EXISTS hot_click_cupo_emprendedor_tb (id SMALLINT PRIMARY KEY, "
            + "limite INTEGER NOT NULL DEFAULT 70, usados INTEGER NOT NULL DEFAULT 0)");
        jdbc.update("DELETE FROM hot_click_cupo_emprendedor_tb");
        jdbc.update("INSERT INTO hot_click_cupo_emprendedor_tb (id, limite, usados) VALUES (1, 70, 0)");
    }

    @AfterEach
    void limpiar() {
        miembroEmpresaRepository.deleteAll();
        empresaRepository.deleteAll();
        usuarioRepository.deleteAll();
    }

    private int usados() {
        return jdbc.queryForObject("SELECT usados FROM hot_click_cupo_emprendedor_tb", Integer.class);
    }

    private Empresa empresaDemoPendiente(boolean correoVerificado) {
        Rol rol = rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR).orElseGet(() -> {
            Rol r = new Rol();
            r.setNombreRol(Constants.ROL_EMPRENDEDOR);
            r.setNivelAcceso(5);
            r.setEstado(Constants.ESTADO_ACTIVO);
            return rolRepository.saveAndFlush(r);
        });
        Usuario dueno = new Usuario();
        dueno.setNombre("Dueno");
        dueno.setCorreo("dueno.prod@correo.com");
        dueno.setApellidoPaterno("Test");
        dueno.setIdentificacion("duenoprod");
        dueno.setTelefono("88888888");
        dueno.setContrasenaHash("no-usado");
        dueno.setEstado(Constants.ESTADO_ACTIVO);
        dueno.setIntentosFallidos(0);
        dueno.setCorreoVerificado(correoVerificado);
        dueno.setRoles(new java.util.ArrayList<>(java.util.List.of(rol)));
        dueno = usuarioRepository.saveAndFlush(dueno);

        Empresa e = new Empresa();
        e.setNombreEmpresa("Demo falso");
        e.setNombreComercial("Demo falso");
        e.setSlug("demo-falso-prod");
        e.setCorreoEmpresa(CORREO_DEMO);
        e.setEstadoEmpresa("PENDIENTE_APROBACION");
        e.setFechaRegistro(LocalDateTime.now());
        ResultadoAltaCupo alta = cupoService.aplicarAlta(e, CORREO_DEMO);
        assertThat(alta.demo()).isFalse();
        e = empresaRepository.saveAndFlush(e);

        MiembroEmpresa m = new MiembroEmpresa();
        m.setUsuario(dueno);
        m.setEmpresa(e);
        m.setRolEnEmpresa("PROPIETARIO");
        m.setEstado(1);
        miembroEmpresaRepository.saveAndFlush(m);
        return e;
    }

    @Test
    @DisplayName("Con prod activo y el flag en true, el alta @hotclick.test NO es demo: PENDIENTE_CUPO, sin plan gratis ni puesto")
    void altaConCorreoDemoEnProdVaPorLaRutaNormal() {
        assertThat(environment.getActiveProfiles()).contains("prod");
        assertThat(environment.getProperty("hotclick.cupo-emprendedor.demo-correo-habilitado")).isEqualTo("true");
        assertThat(cupoService.esDemo(CORREO_DEMO)).isFalse();

        Empresa e = new Empresa();
        ResultadoAltaCupo alta = cupoService.aplicarAlta(e, CORREO_DEMO.toUpperCase());

        assertThat(alta.demo()).isFalse();
        assertThat(alta.cupoGratis()).isFalse();
        assertThat(alta.pendienteCupo()).isTrue();
        assertThat(e.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_PENDIENTE_CUPO);
        assertThat(e.getEstadoPlan()).isNotEqualTo("ACTIVO");
        assertThat(e.getVisibilidadPublica()).isFalse();
        assertThat(e.getTrialEmprendedorPos()).isNull();
        assertThat(usados()).isZero();
    }

    @Test
    @DisplayName("Correo del propietario sin verificar: la aprobación se rechaza aunque el correo del negocio sea @hotclick.test")
    void aprobarExigeCorreoVerificado() {
        Empresa e = empresaDemoPendiente(false);

        assertThatThrownBy(() -> aprobacionService.resolverAlAprobar(e))
            .isInstanceOf(CupoEmprendedorCorreoNoVerificadoException.class);

        assertThat(usados()).isZero();
        assertThat(e.getTrialEmprendedorPos()).isNull();
    }

    @Test
    @DisplayName("Con el correo verificado toma un puesto real (contador +1) al aprobar")
    void aprobarTomaPuestoReal() {
        Empresa e = empresaDemoPendiente(true);

        assertThat(aprobacionService.resolverAlAprobar(e)).isEqualTo(Resultado.TRIAL_ASIGNADO);

        assertThat(usados()).isEqualTo(1);
        assertThat(e.getTrialEmprendedorPos()).isEqualTo(1);
        assertThat(e.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_TRIAL);
    }
}

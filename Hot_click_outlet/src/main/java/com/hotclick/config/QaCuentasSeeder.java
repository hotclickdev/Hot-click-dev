package com.hotclick.config;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.function.UnaryOperator;

/**
 * Cuentas de prueba de dev: emprendedor, PYME y Negocio Plus.
 * Quedan activas, sin fecha de vencimiento.
 *
 * <p>La contraseña sale de {@code QA_DEFAULT_PASSWORD}; sin esa variable no se crean.
 * Nunca corre contra producción, aunque alguien active el perfil {@code dev} ahí.
 */
@Component
@Profile("dev")
@Order(110)
public class QaCuentasSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(QaCuentasSeeder.class);

    private final UsuarioRepository usuarioRepository;
    private final EmpresaRepository empresaRepository;
    private final RolRepository rolRepository;
    private final PlanRepository planRepository;
    private final MiembroEmpresaRepository miembroEmpresaRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    /** Lectura de variables de entorno; los tests la reemplazan. */
    private UnaryOperator<String> entorno = System::getenv;

    void setEntorno(UnaryOperator<String> entorno) { this.entorno = entorno; }

    void setAppUrl(String appUrl) { this.appUrl = appUrl; }

    public QaCuentasSeeder(
            UsuarioRepository usuarioRepository,
            EmpresaRepository empresaRepository,
            RolRepository rolRepository,
            PlanRepository planRepository,
            MiembroEmpresaRepository miembroEmpresaRepository,
            PasswordEncoder passwordEncoder,
            Environment environment) {
        this.usuarioRepository = usuarioRepository;
        this.empresaRepository = empresaRepository;
        this.rolRepository = rolRepository;
        this.planRepository = planRepository;
        this.miembroEmpresaRepository = miembroEmpresaRepository;
        this.passwordEncoder = passwordEncoder;
        this.environment = environment;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (ClaveSemilla.esProduccion(appUrl, environment.getActiveProfiles())) {
            log.error("[seed-qa] app.url apunta a producción: no se crean ni tocan cuentas QA.");
            return;
        }
        if (clave().isEmpty()) {
            log.warn("[seed-qa] Sin {}: no se crean cuentas QA nuevas.", ClaveSemilla.ENV_QA);
        }
        asegurar(Constants.CORREO_QA_EMPRENDEDOR, "Emprendedor", "EMPRENDEDOR", "qa-emprendedor", "QA-EMP-0001");
        asegurar(Constants.CORREO_QA_PYME, "Pyme", "PYME", "qa-pyme", "QA-PYME-0001");
        asegurar(Constants.CORREO_QA_NEGOCIO_PLUS, "Negocio Plus", "NEGOCIO_PLUS", "qa-negocio-plus", "QA-PLUS-0001");
        asegurar(Constants.CORREO_PRUEBA_EMPRENDEDOR, "Emprendedor", "EMPRENDEDOR", "prueba-emprendedor", "PRU-EMP-0001");
        asegurar(Constants.CORREO_PRUEBA_PYME, "Pyme", "PYME", "prueba-pyme", "PRU-PYME-0001");
        asegurar(Constants.CORREO_PRUEBA_NEGOCIO_PLUS, "Negocio Plus", "NEGOCIO_PLUS", "prueba-negocio-plus", "PRU-PLUS-0001");
    }

    private void asegurar(String correo, String apellido, String plan, String slug, String identificacion) {
        usuarioRepository.findByCorreo(correo).ifPresentOrElse(
            this::tocarExistente,
            () -> crear(correo, apellido, plan, slug, identificacion));
    }

    private void tocarExistente(Usuario usuario) {
        Optional<String> clave = clave();
        if ("true".equalsIgnoreCase(entorno.apply("QA_RESET_PASSWORD")) && clave.isPresent()) {
            usuario.setContrasenaHash(passwordEncoder.encode(clave.get()));
            usuarioRepository.save(usuario);
        }
        Empresa empresa = usuario.getEmpresa();
        if (empresa != null) sinCaducidad(empresa);
    }

    private void crear(String correo, String apellido, String nombrePlan, String slug, String identificacion) {
        String clave = clave().orElse(null);
        if (clave == null) return;
        Plan plan = planRepository.findByNombre(nombrePlan).orElse(null);
        if (plan == null) return;
        Empresa empresa = nuevaEmpresa(correo, apellido, slug, plan);
        Usuario usuario = nuevoUsuario(correo, apellido, identificacion, empresa, clave);
        miembroEmpresaRepository.save(new MiembroEmpresa(usuario, empresa, "PROPIETARIO"));
    }

    private Empresa nuevaEmpresa(String correo, String apellido, String slug, Plan plan) {
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa("QA " + apellido);
        empresa.setNombreComercial("QA " + apellido);
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(correo);
        empresa.setTelefonoEmpresa("88880000");
        empresa.setPlan(plan);
        empresa.setPlanSaas(plan.getNombre());
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setVisibilidadPublica(true);
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa.setFechaAprobacion(LocalDateTime.now(Constants.ZONA_CR));
        sinCaducidad(empresa);
        return empresaRepository.save(empresa);
    }

    private Usuario nuevoUsuario(String correo, String apellido, String identificacion, Empresa empresa, String clave) {
        Usuario usuario = new Usuario();
        usuario.setIdentificacion(identificacion);
        usuario.setNombre("QA");
        usuario.setApellidoPaterno(apellido);
        usuario.setCorreo(correo);
        usuario.setTelefono("88880000");
        usuario.setContrasenaHash(passwordEncoder.encode(clave));
        usuario.setEstado(Constants.ESTADO_ACTIVO);
        usuario.setIntentosFallidos(0);
        usuario.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        usuario.setEmpresa(empresa);
        rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR)
            .ifPresent(rol -> usuario.getRoles().add(rol));
        return usuarioRepository.save(usuario);
    }

    private static void sinCaducidad(Empresa empresa) {
        empresa.setEstadoPlan("ACTIVO");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaVencPlan(null);
        empresa.setTrialHasta(null);
        empresa.setVisibilidadPublica(true);
    }

    private Optional<String> clave() {
        return ClaveSemilla.leer(entorno, ClaveSemilla.ENV_QA);
    }
}

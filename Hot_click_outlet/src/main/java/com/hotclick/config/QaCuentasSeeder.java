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
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Cuentas de prueba de dev: emprendedor, PYME y Negocio Plus.
 * Quedan activas, sin fecha de vencimiento.
 */
@Component
@Profile("dev")
@Order(110)
public class QaCuentasSeeder implements ApplicationRunner {

    private final UsuarioRepository usuarioRepository;
    private final EmpresaRepository empresaRepository;
    private final RolRepository rolRepository;
    private final PlanRepository planRepository;
    private final MiembroEmpresaRepository miembroEmpresaRepository;
    private final PasswordEncoder passwordEncoder;

    public QaCuentasSeeder(
            UsuarioRepository usuarioRepository,
            EmpresaRepository empresaRepository,
            RolRepository rolRepository,
            PlanRepository planRepository,
            MiembroEmpresaRepository miembroEmpresaRepository,
            PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.empresaRepository = empresaRepository;
        this.rolRepository = rolRepository;
        this.planRepository = planRepository;
        this.miembroEmpresaRepository = miembroEmpresaRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
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
        if ("true".equalsIgnoreCase(System.getenv("QA_RESET_PASSWORD"))) {
            usuario.setContrasenaHash(passwordEncoder.encode(clave()));
            usuarioRepository.save(usuario);
        }
        Empresa empresa = usuario.getEmpresa();
        if (empresa != null) sinCaducidad(empresa);
    }

    private void crear(String correo, String apellido, String nombrePlan, String slug, String identificacion) {
        Plan plan = planRepository.findByNombre(nombrePlan).orElse(null);
        if (plan == null) return;
        Empresa empresa = nuevaEmpresa(correo, apellido, slug, plan);
        Usuario usuario = nuevoUsuario(correo, apellido, identificacion, empresa);
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

    private Usuario nuevoUsuario(String correo, String apellido, String identificacion, Empresa empresa) {
        Usuario usuario = new Usuario();
        usuario.setIdentificacion(identificacion);
        usuario.setNombre("QA");
        usuario.setApellidoPaterno(apellido);
        usuario.setCorreo(correo);
        usuario.setTelefono("88880000");
        usuario.setContrasenaHash(passwordEncoder.encode(clave()));
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

    private static String clave() {
        String desdeEntorno = System.getenv("QA_DEFAULT_PASSWORD");
        if (desdeEntorno == null || desdeEntorno.isBlank()) return "Prueba1234";
        return desdeEntorno;
    }
}

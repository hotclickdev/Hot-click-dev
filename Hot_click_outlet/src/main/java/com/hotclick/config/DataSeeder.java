package com.hotclick.config;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Component
@Order(100)
public class DataSeeder implements ApplicationRunner {

    @Autowired private RolRepository rolRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private EstadoRepository estadoRepository;
    @Autowired private PlanRepository planRepository;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private Environment environment;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedEstados();
        seedRol(Constants.ROL_ADMIN,         "Administrador del sistema HotClick", 100);
        seedRol(Constants.ROL_EMPRENDEDOR,   "Dueño de empresa",                   7);
        seedRol(Constants.ROL_USUARIO_FINAL, "Cliente final",                       1);
        seedRol(Constants.ROL_SUPPORT, "Staff plataforma — tickets y ver tiendas", 80);
        seedRol(Constants.ROL_FINANCE, "Staff plataforma — payouts, billing y pagos", 80);
        seedRol(Constants.ROL_TRUST,   "Staff plataforma — moderación y suspensiones", 80);
        seedAdminUser();
        seedPlanesSaas();
        if (!environment.matchesProfiles("test")) {
            seedQaCuentas();
        }
    }

    private void seedPlanesSaas() {
        seedPlan(
            "EMPRENDEDOR",
            "Plan gratuito. Comisión 8% por venta (mín. ₡400), cubre pasarela y plataforma.",
            BigDecimal.ZERO, new BigDecimal("8.00"), 0,
            2, 50, 1, 1,
            false, false, false, true, false, false, 0, false
        );
        seedPlan(
            "PYME",
            "Plan para negocios en crecimiento. ₡9.900/mes + 4% por venta (cubre pasarela).",
            new BigDecimal("11.99"), new BigDecimal("4.00"), 9900,
            5, 500, 2, 2,
            true, false, true, true, true, false, 80, true
        );
        seedPlan(
            "NEGOCIO_PLUS",
            "Plan completo. ₡24.900/mes + 4% por venta (cubre pasarela).",
            new BigDecimal("19.99"), new BigDecimal("4.00"), 24900,
            -1, -1, -1, -1,
            true, true, true, true, true, false, -1, true
        );
        backfillSinPlan();
    }

    private void seedPlan(
        String nombre, String descripcion,
        BigDecimal precioUsd, BigDecimal comision, int precioMensualCrc,
        int maxUsuarios, int maxProductos, int maxBodegas, int maxCajas,
        boolean pos, boolean crm, boolean compras, boolean reportes,
        boolean ai, boolean api, int creditosAi, boolean giftCards
    ) {
        var existente = planRepository.findByNombre(nombre);
        if (existente.isPresent()) {
            Plan p = existente.get();
            boolean dirty = false;
            if (!Boolean.TRUE.equals(p.getActivo())) {
                p.setActivo(true);
                dirty = true;
            }
            if (p.getComisionPorcentaje() == null
                    || p.getComisionPorcentaje().compareTo(comision) != 0) {
                p.setComisionPorcentaje(comision);
                dirty = true;
            }
            if (p.getPrecioMensual() == null || p.getPrecioMensual() != precioMensualCrc) {
                p.setPrecioMensual(precioMensualCrc);
                dirty = true;
            }
            if (descripcion != null && !descripcion.equals(p.getDescripcion())) {
                p.setDescripcion(descripcion);
                dirty = true;
            }
            if (dirty) {
                planRepository.save(p);
            }
            return;
        }
        Plan plan = new Plan();
        plan.setNombre(nombre);
        plan.setDescripcion(descripcion);
        plan.setPrecioMensual(precioMensualCrc);
        plan.setPrecioUsd(precioUsd);
        plan.setComisionPorcentaje(comision);
        plan.setMaxUsuarios(maxUsuarios);
        plan.setMaxProductos(maxProductos);
        plan.setMaxBodegas(maxBodegas);
        plan.setMaxCajas(maxCajas);
        plan.setTienePos(pos);
        plan.setTieneCrm(crm);
        plan.setTieneCompras(compras);
        plan.setTieneReportes(reportes);
        plan.setTieneAi(ai);
        plan.setTieneApi(api);
        plan.setTieneGiftCards(giftCards);
        plan.setMaxCreditosAi(creditosAi);
        plan.setActivo(true);
        planRepository.save(plan);
    }

    /** Empresas sin fk_id_plan quedan como EMPRENDEDOR (equivalente a V89). */
    private void backfillSinPlan() {
        Plan emprendedor = planRepository.findByNombre("EMPRENDEDOR").orElse(null);
        if (emprendedor == null) return;
        for (Empresa empresa : empresaRepository.findAll()) {
            if (empresa.getPlan() != null) continue;
            empresa.setPlan(emprendedor);
            empresa.setPlanSaas("EMPRENDEDOR");
            empresaRepository.save(empresa);
        }
    }

    private void seedQaCuentas() {
        seedQaNegocio(
            Constants.CORREO_QA_EMPRENDEDOR,
            "QA Emprendedor",
            "qa-emprendedor",
            "QA Emprendedor Demo",
            "EMPRENDEDOR",
            "QA-EMP-0001",
            "88881001"
        );
        seedQaNegocio(
            Constants.CORREO_QA_PYME,
            "QA Pyme",
            "qa-pyme",
            "QA Pyme Demo",
            "PYME",
            "QA-PYME-0002",
            "88881002"
        );
        seedQaNegocio(
            Constants.CORREO_QA_NEGOCIO_PLUS,
            "QA Negocio Plus",
            "qa-negocio-plus",
            "QA Negocio Plus Demo",
            "NEGOCIO_PLUS",
            "QA-PLUS-0003",
            "88881003"
        );
    }

    private void seedQaNegocio(
        String correo,
        String nombrePersona,
        String slug,
        String nombreEmpresa,
        String nombrePlan,
        String identificacion,
        String telefono
    ) {
        Plan plan = planRepository.findByNombre(nombrePlan).orElse(null);
        if (plan == null) return;

        Empresa empresa = empresaRepository.findByCorreoEmpresa(correo).orElse(null);
        if (empresa == null) {
            empresa = usuarioRepository.findByCorreo(correo)
                .map(Usuario::getEmpresa)
                .orElse(null);
        }
        if (empresa == null) {
            empresa = new Empresa();
            empresa.setNombreEmpresa(nombreEmpresa);
            empresa.setNombreComercial(nombreEmpresa);
            empresa.setSlug(slugDisponible(slug));
            empresa.setCorreoEmpresa(correo);
            empresa.setTelefonoEmpresa(telefono);
            empresa.setEstadoEmpresa("ACTIVO");
            empresa.setVisibilidadPublica(true);
            empresa.setFechaRegistro(LocalDateTime.now());
            empresa.setFechaAprobacion(LocalDateTime.now());
            empresa.setEstado(Constants.ESTADO_ACTIVO);
            empresa.setPlan(plan);
            empresa.setPlanSaas(nombrePlan);
            empresa.setEstadoPlan("ACTIVO");
            empresa = empresaRepository.save(empresa);
        } else {
            empresa.setPlan(plan);
            empresa.setPlanSaas(nombrePlan);
            empresa.setEstadoEmpresa("ACTIVO");
            empresa.setVisibilidadPublica(true);
            empresa.setEstadoPlan("ACTIVO");
            if (empresa.getFechaAprobacion() == null) {
                empresa.setFechaAprobacion(LocalDateTime.now());
            }
            empresa = empresaRepository.save(empresa);
        }

        Usuario usuario = asegurarUsuarioQa(correo, nombrePersona, identificacion, telefono, empresa);
        if (bodegaRepository.countByEmpresaIdAndEstado(empresa.getId(), Constants.ESTADO_ACTIVO) == 0) {
            Bodega bodega = new Bodega();
            bodega.setNombreBodega("Bodega principal");
            bodega.setDireccionExacta("San José, Costa Rica");
            bodega.setTelefono(telefono);
            bodega.setEstado(Constants.ESTADO_ACTIVO);
            bodega.setAdminCliente(usuario);
            bodega.setEmpresa(empresa);
            bodega.setFechaCreacion(LocalDateTime.now());
            bodegaRepository.save(bodega);
        }
    }

    private Usuario asegurarUsuarioQa(
        String correo,
        String nombrePersona,
        String identificacion,
        String telefono,
        Empresa empresa
    ) {
        String password = System.getenv().getOrDefault("QA_DEFAULT_PASSWORD", "QaDemo1234!");
        Usuario usuario = usuarioRepository.findByCorreo(correo).orElse(null);
        if (usuario == null) {
            usuario = new Usuario();
            usuario.setIdentificacion(identificacionUnica(identificacion));
            usuario.setNombre(nombrePersona);
            usuario.setApellidoPaterno("Demo");
            usuario.setCorreo(correo);
            usuario.setTelefono(telefono);
            usuario.setContrasenaHash(passwordEncoder.encode(password));
            usuario.setEstado(Constants.ESTADO_ACTIVO);
            usuario.setIntentosFallidos(0);
            usuario.setEmpresa(empresa);
            usuario.setFechaRegistro(LocalDateTime.now());
            asignarRolEmprendedor(usuario);
            return usuarioRepository.save(usuario);
        }
        usuario.setEmpresa(empresa);
        usuario.setEstado(Constants.ESTADO_ACTIVO);
        usuario.setIntentosFallidos(0);
        usuario.setBloqueadoHasta(null);
        boolean tieneEmprendedor = usuario.getRoles().stream()
            .anyMatch(r -> Constants.ROL_EMPRENDEDOR.equals(r.getNombreRol()));
        if (!tieneEmprendedor) {
            asignarRolEmprendedor(usuario);
        }
        if ("true".equalsIgnoreCase(System.getenv("QA_RESET_PASSWORD"))) {
            usuario.setContrasenaHash(passwordEncoder.encode(password));
        }
        return usuarioRepository.save(usuario);
    }

    private void asignarRolEmprendedor(Usuario usuario) {
        rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR)
            .ifPresent(rol -> usuario.getRoles().add(rol));
    }

    private String slugDisponible(String base) {
        if (!empresaRepository.existsBySlug(base)) return base;
        return base + "-qa";
    }

    private String identificacionUnica(String base) {
        if (!usuarioRepository.existsByIdentificacion(base)) return base;
        return base + "-QA";
    }

    private void seedEstados() {
        seedEstado(Constants.ESTADO_PENDIENTE,  "PENDIENTE",  "Pendiente de aprobación", "#FFA500");
        seedEstado(Constants.ESTADO_ACTIVO,     "ACTIVO",     "Activo en el sistema",    "#28A745");
        seedEstado(Constants.ESTADO_INACTIVO,   "INACTIVO",   "Inactivo",                "#6C757D");
        seedEstado(Constants.ESTADO_ELIMINADO,  "ELIMINADO",  "Eliminado",               "#DC3545");
        seedEstado(Constants.ESTADO_SUSPENDIDO, "SUSPENDIDO", "Suspendido temporalmente","#FFC107");
    }

    private void seedEstado(int id, String nombre, String descripcion, String color) {
        if (!estadoRepository.existsById(id)) {
            Estado e = new Estado();
            e.setIdEstado(id);
            e.setNombreEstado(nombre);
            e.setDescripcion(descripcion);
            e.setCodigoColor(color);
            estadoRepository.save(e);
        }
    }

    private void seedRol(String nombre, String descripcion, int nivel) {
        if (!rolRepository.existsByNombreRol(nombre)) {
            Rol rol = new Rol();
            rol.setNombreRol(nombre);
            rol.setDescripcion(descripcion);
            rol.setNivelAcceso(nivel);
            rol.setEstado(Constants.ESTADO_ACTIVO);
            rolRepository.save(rol);
        }
    }

    private void seedAdminUser() {
        String correo = Constants.CORREO_ADMIN;
        String defaultPassword = System.getenv().getOrDefault("ADMIN_DEFAULT_PASSWORD", "Admin1234!"); // NOSONAR — contraseña de seed, nunca usada en producción con valor por defecto
        if (usuarioRepository.existsByCorreo(correo)) {
            Usuario admin = usuarioRepository.findByCorreo(correo).orElseThrow();
            // La contraseña solo se re-escribe con ADMIN_RESET_PASSWORD=true (mecanismo
            // de recuperación); sin el flag, un cambio hecho desde la app sobrevive reinicios
            if ("true".equalsIgnoreCase(System.getenv("ADMIN_RESET_PASSWORD"))) {
                admin.setContrasenaHash(passwordEncoder.encode(defaultPassword));
            }
            if (admin.getIdentificacion() == null) admin.setIdentificacion("0000000001");
            if (admin.getTelefono() == null)       admin.setTelefono("0000000000");
            admin.setEstado(Constants.ESTADO_ACTIVO);
            admin.setIntentosFallidos(0);
            admin.setBloqueadoHasta(null);
            // ADMIN es staff de plataforma: sin empresa propia.
            admin.setEmpresa(null);
            boolean tieneAdmin = admin.getRoles().stream()
                .anyMatch(r -> r.getNombreRol().equals(Constants.ROL_ADMIN));
            if (!tieneAdmin) {
                rolRepository.findByNombreRol(Constants.ROL_ADMIN)
                    .ifPresent(rol -> admin.getRoles().add(rol));
            }
            usuarioRepository.save(admin);
        } else {
            Usuario admin = new Usuario();
            admin.setIdentificacion("0000000001");
            admin.setNombre("Admin");
            admin.setApellidoPaterno("HotClick");
            admin.setCorreo(correo);
            admin.setTelefono("0000000000");
            admin.setContrasenaHash(passwordEncoder.encode(defaultPassword));
            admin.setEstado(Constants.ESTADO_ACTIVO);
            admin.setIntentosFallidos(0);
            admin.setEmpresa(null);
            rolRepository.findByNombreRol(Constants.ROL_ADMIN)
                .ifPresent(rol -> admin.getRoles().add(rol));
            usuarioRepository.save(admin);
        }

        // Garantizar rol ADMIN a cuenta secundaria configurada por env var
        String correoExtra = System.getenv("ADMIN_EMAIL");
        if (correoExtra != null && !correoExtra.isBlank()) {
            usuarioRepository.findByCorreo(correoExtra.trim().toLowerCase()).ifPresent(u -> {
                u.setEstado(Constants.ESTADO_ACTIVO);
                u.setIntentosFallidos(0);
                u.setBloqueadoHasta(null);
                u.setEmpresa(null);
                boolean tieneAdmin = u.getRoles().stream()
                    .anyMatch(r -> r.getNombreRol().equals(Constants.ROL_ADMIN));
                if (!tieneAdmin) {
                    rolRepository.findByNombreRol(Constants.ROL_ADMIN)
                        .ifPresent(rol -> u.getRoles().add(rol));
                }
                usuarioRepository.save(u);
            });
        }
    }

    private void seedBodegaDefault() {
        if (bodegaRepository.count() == 0) {
            Usuario admin = usuarioRepository.findByCorreo(Constants.CORREO_ADMIN).orElse(null);
            if (admin == null) return;
            Bodega bodega = new Bodega();
            bodega.setNombreBodega("Bodega Principal");
            bodega.setDireccionExacta("San José, Costa Rica");
            bodega.setTelefono("00000000");
            bodega.setEstado(Constants.ESTADO_ACTIVO);
            bodega.setAdminCliente(admin);
            bodegaRepository.save(bodega);
        }
    }

    private void seedCategoriasDefault() {
        if (categoriaRepository.count() == 0) {
            Usuario admin = usuarioRepository.findByCorreo(Constants.CORREO_ADMIN).orElse(null);
            if (admin == null) return;
            String[] nombres = { "Electrónica", "Computación", "Hogar", "Accesorios", "Gaming", "Oficina" };
            for (String nombre : nombres) {
                Categoria cat = new Categoria();
                cat.setNombreCategoria(nombre);
                cat.setEstado(Constants.ESTADO_ACTIVO);
                cat.setAdminCliente(admin);
                categoriaRepository.save(cat);
            }
        }
    }
}

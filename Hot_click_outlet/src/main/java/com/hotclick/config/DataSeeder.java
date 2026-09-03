package com.hotclick.config;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Component
@Order(100)
public class DataSeeder implements ApplicationRunner {

    private static final String DEMO_PYME = "qa.pyme.demo@hotclick.test";
    private static final String DEMO_PLUS = "qa.negocioplus.demo@hotclick.test";

    @Autowired private RolRepository rolRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private EstadoRepository estadoRepository;
    @Autowired private PlanRepository planRepository;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedEstados();
        seedRol(Constants.ROL_ADMIN,         "Administrador del sistema HotClick", 100);
        seedRol(Constants.ROL_EMPRENDEDOR,   "Dueño de empresa",                   7);
        seedRol(Constants.ROL_USUARIO_FINAL, "Cliente final",                       1);
        seedAdminUser();
        seedPlanesSaas();
        asignarPlanesDemo();
    }

    private void seedPlanesSaas() {
        seedPlan(
            "EMPRENDEDOR",
            "Plan gratuito. Comisión 8% por venta (mín. ₡400), cubre pasarela y plataforma.",
            BigDecimal.ZERO, new BigDecimal("8.00"), 0,
            2, 50, 1, 1,
            false, false, false, true, false, false, 0
        );
        seedPlan(
            "PYME",
            "Plan para negocios en crecimiento. ₡9.900/mes + 4% por venta (cubre pasarela).",
            new BigDecimal("11.99"), new BigDecimal("4.00"), 9900,
            5, 500, 2, 2,
            true, false, true, true, true, false, 80
        );
        seedPlan(
            "NEGOCIO_PLUS",
            "Plan completo. ₡24.900/mes + 4% por venta (cubre pasarela).",
            new BigDecimal("19.99"), new BigDecimal("4.00"), 24900,
            -1, -1, -1, -1,
            true, true, true, true, true, false, -1
        );
        backfillSinPlan();
    }

    private void seedPlan(
        String nombre, String descripcion,
        BigDecimal precioUsd, BigDecimal comision, int precioMensualCrc,
        int maxUsuarios, int maxProductos, int maxBodegas, int maxCajas,
        boolean pos, boolean crm, boolean compras, boolean reportes,
        boolean ai, boolean api, int creditosAi
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

    private void asignarPlanesDemo() {
        asignarPlanPorCorreo(DEMO_PYME, "PYME");
        asignarPlanPorCorreo(DEMO_PLUS, "NEGOCIO_PLUS");
    }

    private void asignarPlanPorCorreo(String correo, String nombrePlan) {
        Plan plan = planRepository.findByNombre(nombrePlan).orElse(null);
        if (plan == null) return;
        usuarioRepository.findByCorreo(correo).ifPresent(usuario -> {
            Empresa empresa = usuario.getEmpresa();
            if (empresa == null) return;
            empresa.setPlan(plan);
            empresa.setPlanSaas(nombrePlan);
            empresaRepository.save(empresa);
        });
        empresaRepository.findByCorreoEmpresa(correo).ifPresent(empresa -> {
            empresa.setPlan(plan);
            empresa.setPlanSaas(nombrePlan);
            empresaRepository.save(empresa);
        });
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
        String correo = "admin@hotclick.com";
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
            Usuario admin = usuarioRepository.findByCorreo("admin@hotclick.com").orElse(null);
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
            Usuario admin = usuarioRepository.findByCorreo("admin@hotclick.com").orElse(null);
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

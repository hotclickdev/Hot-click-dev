package com.hotclick.config;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.function.UnaryOperator;

@Component
@Order(100)
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

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
    @Autowired(required = false) private Environment environment;

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    /** Lectura de variables de entorno; los tests la reemplazan. */
    private UnaryOperator<String> entorno = System::getenv;

    void setEntorno(UnaryOperator<String> entorno) { this.entorno = entorno; }

    void setAppUrl(String appUrl) { this.appUrl = appUrl; }

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
            "Plan gratuito. Comisión 9% por venta (mín. ₡600), cubre pasarela Tilopay y plataforma.",
            BigDecimal.ZERO, new BigDecimal("9.00"), 0,
            2, 50, 1, 1,
            false, false, false, true, false, false, 0, false
        );
        seedPlan(
            "PYME",
            "Plan para negocios en crecimiento. ₡9.900/mes + 6% por venta (cubre Tilopay).",
            new BigDecimal("11.99"), new BigDecimal("6.00"), 9900,
            5, 500, 2, 2,
            true, false, true, true, true, false, 80, true
        );
        seedPlan(
            "NEGOCIO_PLUS",
            "Plan completo. ₡24.900/mes + 6% por venta (cubre Tilopay).",
            new BigDecimal("19.99"), new BigDecimal("6.00"), 24900,
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
        String correo = Constants.CORREO_ADMIN;
        boolean produccion = ClaveSemilla.esProduccion(appUrl,
            environment == null ? null : environment.getActiveProfiles());
        String clave = claveAdmin(produccion).orElse(null);
        if (usuarioRepository.existsByCorreo(correo)) {
            actualizarAdminExistente(usuarioRepository.findByCorreo(correo).orElseThrow(), clave);
        } else {
            crearAdmin(correo, clave, produccion);
        }
        asegurarAdminSecundario();
    }

    /**
     * Contraseña del admin desde el entorno, nunca un valor fijo del código.
     * En producción además tiene que ser fuerte ({@link ClaveSemilla#esFuerte}).
     */
    private Optional<String> claveAdmin(boolean produccion) {
        Optional<String> clave = ClaveSemilla.leer(entorno, ClaveSemilla.ENV_ADMIN, ClaveSemilla.ENV_ADMIN_LEGADO);
        if (clave.isPresent() && produccion && !ClaveSemilla.esFuerte(clave.get())) {
            log.error("[seed] {} es débil (mínimo {} caracteres, 3 tipos de carácter y sin secuencias obvias): se ignora en producción.",
                ClaveSemilla.ENV_ADMIN, ClaveSemilla.LARGO_MINIMO_PRODUCCION);
            return Optional.empty();
        }
        return clave;
    }

    private void actualizarAdminExistente(Usuario admin, String clave) {
        // La contraseña solo se re-escribe con ADMIN_RESET_PASSWORD=true (mecanismo
        // de recuperación); sin el flag, un cambio hecho desde la app sobrevive reinicios
        if ("true".equalsIgnoreCase(entorno.apply("ADMIN_RESET_PASSWORD"))) {
            if (clave != null) {
                admin.setContrasenaHash(passwordEncoder.encode(clave));
                admin.setSesionesInvalidadasEn(LocalDateTime.now(Constants.ZONA_CR));
                log.warn("[seed] ADMIN_RESET_PASSWORD=true: contraseña del admin reseteada desde {}. Volvé a poner el flag en false.",
                    ClaveSemilla.ENV_ADMIN);
            } else {
                log.error("[seed] ADMIN_RESET_PASSWORD=true pero falta {} (o no es válida): la contraseña del admin no se cambia.",
                    ClaveSemilla.ENV_ADMIN);
            }
        }
        if (admin.getIdentificacion() == null) admin.setIdentificacion("0000000001");
        if (admin.getTelefono() == null)       admin.setTelefono("0000000000");
        admin.setEstado(Constants.ESTADO_ACTIVO);
        admin.setIntentosFallidos(0);
        admin.setBloqueadoHasta(null);
        // ADMIN es staff de plataforma: sin empresa propia.
        admin.setEmpresa(null);
        agregarRolAdminSiFalta(admin);
        usuarioRepository.save(admin);
    }

    private void crearAdmin(String correo, String clave, boolean produccion) {
        if (clave == null && produccion) {
            log.error("[seed] Producción: no se crea {} porque falta {} o no es válida. Configurala en el .env y reiniciá.",
                correo, ClaveSemilla.ENV_ADMIN);
            return;
        }
        if (clave == null) {
            log.warn("[seed] {} sin {}: se crea con una contraseña aleatoria que nadie conoce. "
                + "Para entrar, configurá {} y ADMIN_RESET_PASSWORD=true y reiniciá.",
                correo, ClaveSemilla.ENV_ADMIN, ClaveSemilla.ENV_ADMIN);
        }
        Usuario admin = new Usuario();
        admin.setIdentificacion("0000000001");
        admin.setNombre("Admin");
        admin.setApellidoPaterno("HotClick");
        admin.setCorreo(correo);
        admin.setTelefono("0000000000");
        admin.setContrasenaHash(passwordEncoder.encode(clave != null ? clave : ClaveSemilla.aleatoriaInutilizable()));
        admin.setEstado(Constants.ESTADO_ACTIVO);
        admin.setIntentosFallidos(0);
        admin.setEmpresa(null);
        agregarRolAdminSiFalta(admin);
        usuarioRepository.save(admin);
    }

    /** Garantizar rol ADMIN a cuenta secundaria configurada por env var. */
    private void asegurarAdminSecundario() {
        String correoExtra = entorno.apply("ADMIN_EMAIL");
        if (correoExtra == null || correoExtra.isBlank()) return;
        usuarioRepository.findByCorreo(correoExtra.trim().toLowerCase()).ifPresent(u -> {
            u.setEstado(Constants.ESTADO_ACTIVO);
            u.setIntentosFallidos(0);
            u.setBloqueadoHasta(null);
            u.setEmpresa(null);
            agregarRolAdminSiFalta(u);
            usuarioRepository.save(u);
        });
    }

    private void agregarRolAdminSiFalta(Usuario usuario) {
        boolean tieneAdmin = usuario.getRoles().stream()
            .anyMatch(r -> r.getNombreRol().equals(Constants.ROL_ADMIN));
        if (!tieneAdmin) {
            rolRepository.findByNombreRol(Constants.ROL_ADMIN)
                .ifPresent(rol -> usuario.getRoles().add(rol));
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

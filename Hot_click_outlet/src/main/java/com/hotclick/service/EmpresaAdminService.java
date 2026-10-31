package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SancionPlataformaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class EmpresaAdminService {

    static final List<String> PLANES_VALIDOS = List.of("EMPRENDEDOR", "PYME", "NEGOCIO_PLUS");
    private static final List<String> ESTADOS_VALIDOS = List.of("ACTIVO", "SUSPENDIDO", "INACTIVO");
    private static final int MAX_TAB_PRODUCTOS = 200;
    // Mismo set que EquipoController.ROLES_PERMITIDOS (equipo propio) — se
    // duplica acá porque ese campo es privado y este es un camino distinto
    // (ADMIN operando sobre una empresa ajena, sin impersonar).
    private static final Set<String> ROLES_EQUIPO_VALIDOS = Set.of("EDITOR", "LECTOR", "ADMIN");
    private static final String ALFABETO_PASSWORD_TEMPORAL =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final SecureRandom RNG = new SecureRandom();

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private SancionPlataformaRepository sancionRepo;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private PlanRepository planRepository;
    @Autowired private EmpresaAprobacionService empresaAprobacionService;
    @Autowired private EquipoService equipoService;
    @Autowired private AuditoriaAdminRegistroService auditoriaAdminRegistroService;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listar(int page, int size) {
        var empresas = empresaRepository.findAll(PageRequest.of(page, Math.min(size, 200)));
        return empresas.getContent().stream().map(this::toMap).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detalle(Long id) {
        Empresa e = empresa(id);
        Map<String, Object> data = toMap(e);
        data.put("totalUsuarios", usuarioRepository.countMiembrosActivosByEmpresaId(id));
        data.put("totalProductos", productoRepository.countProductosActivosByEmpresaId(id));
        data.put("totalPedidos", pedidoRepository.countTotalPedidosByEmpresaId(id));
        data.put("totalVentas", pedidoRepository.sumTotalVentasByEmpresaId(id));
        return data;
    }

    @Transactional
    public void cambiarEstado(Long id, String nuevoEstado, String motivo) {
        if (nuevoEstado == null || !ESTADOS_VALIDOS.contains(nuevoEstado)) {
            throw new IllegalArgumentException("Estado inválido");
        }
        if (exigeMotivo(nuevoEstado) && (motivo == null || motivo.isBlank())) {
            throw new IllegalArgumentException("Motivo obligatorio para suspender o inactivar");
        }
        // Lock pesimista hasta el commit: el job de impago (UPDATE) espera y no se pisa con la entidad vieja.
        Empresa empresa = empresaBloqueada(id);
        // Fail-closed: desde impago no hay salida admin genérica (ni a ACTIVO ni a otro estado que luego se active).
        if (com.hotclick.service.suscripcion.SuspensionImpago.estaSuspendida(empresa.getEstadoEmpresa())) {
            throw new com.hotclick.exception.ReactivacionSinPagoException();
        }
        if ("ACTIVO".equals(nuevoEstado)) {
            empresaAprobacionService.aprobarYPublicar(id);
            auditarEstado(id, nuevoEstado, motivo);
            return;
        }
        empresa.setEstadoEmpresa(nuevoEstado);
        empresa.setVisibilidadPublica(false);
        empresaRepository.save(empresa);
        auditarEstado(id, nuevoEstado, motivo);
    }

    private static boolean exigeMotivo(String estado) {
        return "SUSPENDIDO".equals(estado) || "INACTIVO".equals(estado);
    }

    private void auditarEstado(Long id, String estado, String motivo) {
        String detalle = motivo == null || motivo.isBlank() ? estado : estado + ": " + motivo.trim();
        auditoriaAdminRegistroService.registrarSiAdmin(
            "EMPRESA_CAMBIO_ESTADO", "EMPRESA", id, id, detalle);
    }

    @Transactional
    @CacheEvict(value = "tenantInfo", key = "#id")
    public String cambiarPlan(Long id, String nombrePlan) {
        if (nombrePlan == null || !PLANES_VALIDOS.contains(nombrePlan)) {
            throw new IllegalArgumentException("Plan inválido. Valores permitidos: " + PLANES_VALIDOS);
        }
        Plan plan = planRepository.findByNombre(nombrePlan)
            .orElseThrow(() -> new IllegalStateException("Plan " + nombrePlan + " no configurado en hot_click_plan_tb"));
        Empresa empresa = empresaBloqueada(id);
        // Igual que #333: una tienda en impago no cambia de plan (ni por convenio); solo paga lo pendiente.
        if (com.hotclick.service.suscripcion.SuspensionImpago.estaSuspendida(empresa.getEstadoEmpresa())) throw new com.hotclick.exception.ReactivacionSinPagoException();
        empresa.setPlan(plan);
        empresa.setPlanSaas(nombrePlan);
        empresaRepository.save(empresa);
        auditoriaAdminRegistroService.registrarSiAdmin(
            "EMPRESA_CAMBIO_PLAN", "EMPRESA", id, id, "convenio: " + nombrePlan);
        return nombrePlan;
    }

    @Transactional
    public boolean cambiarVisibilidad(Long id, Object val) {
        if (val == null) throw new IllegalArgumentException("Campo visibilidadPublica requerido");
        Empresa empresa = empresaBloqueada(id);
        boolean visible = Boolean.parseBoolean(val.toString());
        if (visible && com.hotclick.service.suscripcion.SuspensionImpago.estaSuspendida(empresa.getEstadoEmpresa())) {
            throw new com.hotclick.exception.ReactivacionSinPagoException();
        }
        if (visible && sancionRepo.existsByEmpresaIdAndActivaTrue(id)) {
            throw new IllegalArgumentException("Hay una sanción vigente. El catálogo sigue oculto.");
        }
        empresa.setVisibilidadPublica(visible);
        empresaRepository.save(empresa);
        return visible;
    }

    public List<Map<String, Object>> productos(Long id, int page, int size) {
        empresa(id);
        int pageSize = Math.min(Math.max(size, 1), MAX_TAB_PRODUCTOS);
        var pageable = PageRequest.of(Math.max(0, page), pageSize);
        var pagina = productoRepository.findByEmpresaIdAndEstado(id, Constants.ESTADO_ACTIVO, pageable);
        return pagina.getContent().stream().map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", p.getId());
            m.put("nombre", p.getNombreProducto());
            m.put("precio", p.getPrecioVenta());
            m.put("stock", p.getStockActual());
            m.put("imagenUrl", p.getImagenPrincipalUrl());
            m.put("visibleCatalogo", p.getVisibleCatalogo());
            m.put("categoria", p.getCategoria() != null ? p.getCategoria().getNombreCategoria() : null);
            return m;
        }).toList();
    }

    public List<Map<String, Object>> pedidos(Long id) {
        empresa(id);
        return pedidoRepository.findUltimosByEmpresaId(id, PageRequest.of(0, 15)).stream()
            .map(this::filaPedido)
            .toList();
    }

    public List<Map<String, Object>> equipo(Long id) {
        empresa(id);
        return miembroEmpresaRepository.findByEmpresaIdAndEstado(id, 1).stream()
            .map(this::filaEquipo)
            .toList();
    }

    /**
     * ADMIN invita a un miembro a nombre de una empresa ajena, sin impersonar.
     * La contraseña se genera acá (nunca la ve/tipea el ADMIN) y viaja por
     * correo al invitado vía el mismo flujo que ya usa EquipoService para
     * altas nuevas — enviarInvitacionMiembro() ya adjunta la clave cuando
     * el usuario es nuevo.
     */
    public void invitarMiembro(Long id, String nombre, String correo, String telefono, String rolEnEmpresa) {
        if (nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException("El nombre es requerido");
        }
        if (correo == null || correo.isBlank()) {
            throw new IllegalArgumentException("El correo es requerido");
        }
        if (rolEnEmpresa == null || !ROLES_EQUIPO_VALIDOS.contains(rolEnEmpresa)) {
            throw new IllegalArgumentException("Rol inválido. Valores aceptados: EDITOR, LECTOR");
        }
        empresa(id);   // 404 si no existe
        String correoNorm = correo.trim().toLowerCase(java.util.Locale.ROOT);
        String telefonoNorm = (telefono != null && !telefono.isBlank()) ? telefono : "00000000";
        equipoService.invitar(id, nombre, correoNorm, generarPasswordTemporal(), telefonoNorm, rolEnEmpresa);
        auditoriaAdminRegistroService.registrarSiAdmin("EQUIPO_INVITAR", "MIEMBRO_EMPRESA", null, id,
            "Invitación a " + correoNorm + " como " + rolEnEmpresa);
    }

    public Map<String, Object> cambiarRolMiembro(Long id, Long miembroId, String nuevoRol) {
        if (nuevoRol == null || !ROLES_EQUIPO_VALIDOS.contains(nuevoRol)) {
            throw new IllegalArgumentException("Rol inválido. Valores aceptados: EDITOR, LECTOR");
        }
        empresa(id);
        Map<String, Object> resultado = equipoService.cambiarRol(miembroId, id, nuevoRol);
        auditoriaAdminRegistroService.registrarSiAdmin("EQUIPO_CAMBIO_ROL", "MIEMBRO_EMPRESA", miembroId, id,
            "Rol cambiado a " + nuevoRol);
        return resultado;
    }

    public void eliminarMiembro(Long id, Long miembroId, Long actorUserId) {
        empresa(id);
        equipoService.eliminar(miembroId, id, actorUserId);
        auditoriaAdminRegistroService.registrarSiAdmin("EQUIPO_ELIMINAR", "MIEMBRO_EMPRESA", miembroId, id, null);
    }

    private static final String LETRAS_MAYUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LETRAS_MINUSCULAS = "abcdefghijkmnpqrstuvwxyz";
    private static final String DIGITOS_SIN_AMBIGUOS = "23456789";
    static final int LARGO_PASSWORD_TEMPORAL = 12;

    /**
     * Clave temporal de 12 caracteres con SecureRandom que siempre cumple
     * {@link com.hotclick.service.auth.AuthSupport#cumplePoliticaContrasena}: garantiza al menos
     * una mayúscula, una minúscula y un dígito y mezcla las posiciones (Fisher-Yates).
     * Nunca se loguea.
     */
    static String generarPasswordTemporal() {
        char[] c = new char[LARGO_PASSWORD_TEMPORAL];
        c[0] = elegir(LETRAS_MAYUSCULAS);
        c[1] = elegir(LETRAS_MINUSCULAS);
        c[2] = elegir(DIGITOS_SIN_AMBIGUOS);
        for (int i = 3; i < c.length; i++) {
            c[i] = elegir(ALFABETO_PASSWORD_TEMPORAL);
        }
        for (int i = c.length - 1; i > 0; i--) {
            int j = RNG.nextInt(i + 1);
            char t = c[i]; c[i] = c[j]; c[j] = t;
        }
        return new String(c);
    }

    private static char elegir(String alfabeto) {
        return alfabeto.charAt(RNG.nextInt(alfabeto.length()));
    }

    /** Lectura con PESSIMISTIC_WRITE (requiere transacción): estado fresco y sin carrera con el job de impago. */
    private Empresa empresaBloqueada(Long id) {
        return empresaRepository.findByIdForUpdate(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
    }

    private Empresa empresa(Long id) {
        return empresaRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
    }

    private Map<String, Object> toMap(Empresa e) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", e.getId());
        m.put("nombreEmpresa", e.getNombreEmpresa());
        m.put("nombreComercial", e.getNombreComercial());
        m.put("slug", e.getSlug());
        m.put("correoEmpresa", e.getCorreoEmpresa());
        m.put("telefonoEmpresa", e.getTelefonoEmpresa());
        m.put("plan", e.getPlan() != null ? e.getPlan().getNombre() : null);
        m.put("planSaas", e.getPlanSaas());
        m.put("estadoEmpresa", e.getEstadoEmpresa());
        m.put("visibilidadPublica", Boolean.TRUE.equals(e.getVisibilidadPublica()));
        m.put("destacado", Boolean.TRUE.equals(e.getDestacado()));
        m.put("destacadoOrden", e.getDestacadoOrden());
        m.put("fechaRegistro", e.getFechaRegistro());
        m.put("fechaAprobacion", e.getFechaAprobacion());
        m.put("logoUrl", e.getLogoUrl());
        return m;
    }

    private Map<String, Object> filaPedido(Pedido p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.getId());
        m.put("fecha", p.getFechaPedido());
        m.put("total", p.getTotalPedido());
        m.put("estado", p.getEstadoPedido());
        m.put("cliente", nombreClientePedido(p));
        m.put("metodoPago", p.getMetodoPago());
        m.put("numeroGuia", p.getNumeroGuia());
        m.put("origen", p.getOrigen());
        // Compras con productos de varios vendedores comparten este código — un pago, un paquete por vendedor.
        // Se expone para que el vendedor sepa que su subpedido es parte de un pago agrupado (ver PedidoGrupoService).
        m.put("grupoPago", p.getGrupoPago());
        return m;
    }

    private Map<String, Object> filaEquipo(com.hotclick.model.MiembroEmpresa m) {
        var u = m.getUsuario();
        Map<String, Object> r = new HashMap<>();
        r.put("id", u.getId());
        r.put("nombre", u.getNombre() + " " + (u.getApellidoPaterno() != null ? u.getApellidoPaterno() : ""));
        r.put("correo", u.getCorreo());
        r.put("telefono", u.getTelefono());
        r.put("rol", m.getRolEnEmpresa());
        r.put("fechaIngreso", m.getFechaIngreso());
        r.put("estado", u.getEstado());
        return r;
    }

    private static String nombreClientePedido(Pedido p) {
        if (p.getUsuarioFinal() == null) return "—";
        String apellido = p.getUsuarioFinal().getApellidoPaterno() != null
            ? p.getUsuarioFinal().getApellidoPaterno() : "";
        return p.getUsuarioFinal().getNombre() + " " + apellido;
    }

    /** Pausa o reanuda los cobros en línea del negocio. Queda auditado. */
    public boolean cambiarCobrosPausados(Long id, Object val) {
        if (!(val instanceof Boolean pausar)) {
            throw new IllegalArgumentException("Campo cobrosPausados requerido (true o false)");
        }
        Empresa empresa = empresa(id);
        empresa.setCobrosPausados(pausar);
        empresaRepository.save(empresa);
        auditoriaAdminRegistroService.registrarSiAdmin(
            pausar ? "EMPRESA_COBROS_PAUSADOS" : "EMPRESA_COBROS_REANUDADOS", "EMPRESA", id, id,
            pausar ? "Pausada" : "Reanudada");
        return pausar;
    }

    /** Pausa o reanuda la tienda pública (410 TIENDA_PAUSADA). Queda auditado. */
    @CacheEvict(value = "tenantInfo", key = "#id")
    public boolean cambiarTiendaPausada(Long id, Object val) {
        if (!(val instanceof Boolean pausar)) {
            throw new IllegalArgumentException("Campo tiendaPausada requerido (true o false)");
        }
        Empresa empresa = empresa(id);
        empresa.setTiendaPausada(pausar);
        empresaRepository.save(empresa);
        auditoriaAdminRegistroService.registrarSiAdmin(
            pausar ? "EMPRESA_TIENDA_PAUSADA" : "EMPRESA_TIENDA_REANUDADA", "EMPRESA", id, id,
            pausar ? "Pausada" : "Reanudada");
        return pausar;
    }
}

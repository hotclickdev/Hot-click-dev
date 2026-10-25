package com.hotclick.service.pos;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.OrigenPedido;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.PosAnulacion;
import com.hotclick.model.TurnoCaja;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.PosAnulacionRepository;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.repository.PosVentaTurnoRepository;
import com.hotclick.repository.TurnoCajaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.StockService;
import com.hotclick.service.TurnoCajaService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * A3 (decisión del dueño 25-oct-2026): anulaciones y devoluciones de ventas POS.
 * <ul>
 *   <li>CAJERO anula solo ventas de SU turno ABIERTO (antes del cierre de caja).</li>
 *   <li>Devoluciones y anulaciones de turnos cerrados: solo PROPIETARIO (sin sesión de soporte) o ADMIN de plataforma.</li>
 *   <li>Toda operación queda en hot_click_pos_anulacion_tb con usuario, motivo y hora.</li>
 * </ul>
 * Fail-closed: sin usuario, sin negocio, rol desconocido o venta sin turno conocido → se niega.
 */
@Service
public class PosAnulacionService {

    private static final Logger log = LoggerFactory.getLogger(PosAnulacionService.class);
    static final int MOTIVO_MAX = 500;
    static final String ROL_CAJERO = "CAJERO";
    static final String MSG_SOLO_DUENIO = "Solo el dueño del negocio o un ADMIN puede hacer esto.";
    static final String ESTADO_ANULADO = "ANULADO";
    static final String ESTADO_DEVUELTO = "DEVUELTO";
    private static final Set<String> ESTADOS_FINALES = Set.of(ESTADO_ANULADO, ESTADO_DEVUELTO, "CANCELADO");

    private final CompanyScope companyScope;
    private final PropietarioGuard propietarioGuard;
    private final MiembroEmpresaRepository miembros;
    private final PedidoRepository pedidoRepository;
    private final PosVentaTurnoRepository ventaTurnoRepository;
    private final PosQrSesionRepository qrSesionRepository;
    private final TurnoCajaRepository turnoCajaRepository;
    private final TurnoCajaService turnoCajaService;
    private final StockService stockService;
    private final PosAnulacionRepository anulacionRepository;

    public PosAnulacionService(CompanyScope companyScope, PropietarioGuard propietarioGuard,
                               MiembroEmpresaRepository miembros, PedidoRepository pedidoRepository,
                               PosVentaTurnoRepository ventaTurnoRepository, PosQrSesionRepository qrSesionRepository,
                               TurnoCajaRepository turnoCajaRepository, TurnoCajaService turnoCajaService,
                               StockService stockService, PosAnulacionRepository anulacionRepository) {
        this.companyScope = companyScope;
        this.propietarioGuard = propietarioGuard;
        this.miembros = miembros;
        this.pedidoRepository = pedidoRepository;
        this.ventaTurnoRepository = ventaTurnoRepository;
        this.qrSesionRepository = qrSesionRepository;
        this.turnoCajaRepository = turnoCajaRepository;
        this.turnoCajaService = turnoCajaService;
        this.stockService = stockService;
        this.anulacionRepository = anulacionRepository;
    }

    @Transactional
    public PosAnulacion anular(Long pedidoId, Long empresaToken, String motivo) {
        return ejecutar(PosAnulacion.ANULACION, pedidoId, empresaToken, motivo);
    }

    @Transactional
    public PosAnulacion devolver(Long pedidoId, Long empresaToken, String motivo) {
        return ejecutar(PosAnulacion.DEVOLUCION, pedidoId, empresaToken, motivo);
    }

    @Transactional(readOnly = true)
    public List<PosAnulacion> bitacora(Long empresaToken) {
        Usuario actor = exigirActor();
        Long empresaId = exigirEmpresa(empresaToken, actor);
        if (!esPrivilegiado(actor, empresaId)) throw new SecurityException(MSG_SOLO_DUENIO);
        return anulacionRepository.findByEmpresaIdOrderByFechaDesc(empresaId);
    }

    private PosAnulacion ejecutar(String tipo, Long pedidoId, Long empresaToken, String motivoCrudo) {
        String motivo = exigirMotivo(motivoCrudo);
        Usuario actor = exigirActor();
        Pedido pedido = pedidoId == null ? null : pedidoRepository.findById(pedidoId).orElse(null);
        if (pedido == null) throw new RecursoNoEncontradoException("Venta", pedidoId);
        Long empresaPedido = pedido.getEmpresa() != null ? pedido.getEmpresa().getId() : null;
        Long empresaId = exigirEmpresa(empresaToken != null ? empresaToken : empresaPedido, actor);
        if (empresaPedido == null || !empresaPedido.equals(empresaId)) {
            // Otro negocio (o venta sin negocio): no se revela que existe.
            throw new RecursoNoEncontradoException("Venta", pedidoId);
        }
        if (!OrigenPedido.POS.codigo().equals(pedido.getOrigen())) {
            throw new IllegalArgumentException("Solo se anulan o devuelven ventas de caja (POS).");
        }
        if (pedido.getEstadoPedido() != null && ESTADOS_FINALES.contains(pedido.getEstadoPedido())) {
            throw new IllegalStateException("Esta venta ya fue anulada o devuelta.");
        }

        TurnoCaja turno = resolverTurno(pedido);
        boolean privilegiado = esPrivilegiado(actor, empresaId);
        String rol = privilegiado ? rolPrivilegiado(actor) : rolDeEquipo(actor, empresaId);
        if (!privilegiado) {
            exigirCajeroEnTurnoAbierto(tipo, rol, actor, empresaId, turno);
        }

        reponerStock(pedido, tipo, actor);
        boolean turnoAbierto = turno != null && "ABIERTO".equals(turno.getEstado());
        if (PosAnulacion.ANULACION.equals(tipo) && turnoAbierto) {
            turnoCajaService.revertirTotales(turno.getId(), pedido.getMetodoPago(), pedido.getTotalPedido());
        }
        pedido.setEstadoPedido(PosAnulacion.ANULACION.equals(tipo) ? ESTADO_ANULADO : ESTADO_DEVUELTO);
        pedidoRepository.save(pedido);

        PosAnulacion reg = new PosAnulacion();
        reg.setTipo(tipo);
        reg.setPedidoId(pedido.getId());
        reg.setEmpresaId(empresaId);
        reg.setTurnoId(turno != null ? turno.getId() : null);
        reg.setEstadoTurno(turno != null ? turno.getEstado() : null);
        reg.setUsuarioId(actor.getId());
        reg.setRolActor(rol);
        reg.setMotivo(motivo);
        reg.setMonto(pedido.getTotalPedido());
        reg.setFecha(LocalDateTime.now(Constants.ZONA_CR));
        PosAnulacion saved = anulacionRepository.save(reg);
        log.info("[POS] {} de venta {} por usuario {} ({})", tipo, pedido.getId(), actor.getId(), rol);
        return saved;
    }

    static String exigirMotivo(String motivo) {
        String m = motivo == null ? "" : motivo.strip();
        if (m.isEmpty()) throw new IllegalArgumentException("El motivo es obligatorio.");
        if (m.length() > MOTIVO_MAX) {
            throw new IllegalArgumentException("El motivo no puede pasar de " + MOTIVO_MAX + " caracteres.");
        }
        return m;
    }

    private Usuario exigirActor() {
        Usuario u = companyScope.getCurrentUser();
        if (u == null || u.getId() == null) throw new SecurityException("Sesión no válida");
        return u;
    }

    private Long exigirEmpresa(Long empresaId, Usuario actor) {
        if (empresaId == null) throw new SecurityException("No hay negocio en la sesión");
        return empresaId;
    }

    private boolean esPrivilegiado(Usuario actor, Long empresaId) {
        if (companyScope.isAdminIT()) return true;
        return !companyScope.isImpersonating() && propietarioGuard.esPropietario(actor, empresaId);
    }

    private String rolPrivilegiado(Usuario actor) {
        return companyScope.isAdminIT() ? "ADMIN_PLATAFORMA" : "PROPIETARIO";
    }

    /** Rol de equipo activo; sin fila activa → DESCONOCIDO (se niega). */
    private String rolDeEquipo(Usuario actor, Long empresaId) {
        return miembros.findByUsuarioIdAndEmpresaIdAndEstado(actor.getId(), empresaId, 1)
            .map(MiembroEmpresa::getRolEnEmpresa)
            .filter(r -> r != null && !r.isBlank())
            .orElse("DESCONOCIDO");
    }

    private void exigirCajeroEnTurnoAbierto(String tipo, String rol, Usuario actor, Long empresaId, TurnoCaja turno) {
        if (!PosAnulacion.ANULACION.equals(tipo) || companyScope.isImpersonating() || !ROL_CAJERO.equals(rol)) {
            throw new SecurityException(MSG_SOLO_DUENIO);
        }
        if (turno == null || !"ABIERTO".equals(turno.getEstado())) {
            throw new SecurityException("La caja de esa venta ya se cerró: la anulación la aprueba el dueño o un ADMIN.");
        }
        Long empresaTurno = turno.getEmpresa() != null ? turno.getEmpresa().getId() : null;
        Long cajeroTurno = turno.getUsuario() != null ? turno.getUsuario().getId() : null;
        if (!empresaId.equals(empresaTurno) || !actor.getId().equals(cajeroTurno)) {
            throw new SecurityException("Solo podés anular ventas de tu propio turno abierto.");
        }
    }

    /** Turno de la venta: caja directa (venta_turno) o QR (sesión). Sin dato → null (= cerrado). */
    private TurnoCaja resolverTurno(Pedido pedido) {
        Long turnoId = ventaTurnoRepository.findByPedidoId(pedido.getId())
            .map(vt -> vt.getTurnoId()).orElse(null);
        if (turnoId != null) return turnoCajaRepository.findById(turnoId).orElse(null);
        return qrSesionRepository.findByPedidoId(pedido.getId())
            .map(s -> s.getTurno()).orElse(null);
    }

    private void reponerStock(Pedido pedido, String tipo, Usuario actor) {
        List<PedidoItem> items = pedido.getItems() != null ? pedido.getItems() : List.of();
        for (PedidoItem item : items) {
            if (item.getProducto() == null || item.getCantidad() == null || item.getCantidad() <= 0) continue;
            stockService.ajustarEntrada(item.getProducto().getId(), item.getCantidad(),
                tipo + " " + pedido.getNumeroPedido(), actor.getCorreo());
        }
    }
}

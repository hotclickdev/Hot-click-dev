package com.hotclick.service.pedido;

import com.hotclick.model.ComprobanteSinpe;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.ComprobanteSinpeRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * SEC-05: confirmación manual del pago ({@code → PAGADO}) desde el cambio de estado.
 *
 * <ul>
 *   <li>Solo para métodos manuales (efectivo / contra entrega, SINPE, transferencia). Un pedido de
 *       tarjeta (TILOPAY, STRIPE, ONVO) o con un {@link Pago} de pasarela nunca se marca a mano.</li>
 *   <li>Exige una referencia del pago (máx. {@value #LARGO_MAXIMO_REFERENCIA} caracteres) o, en SINPE,
 *       un comprobante subido por el cliente que queda aprobado por quien confirma.</li>
 *   <li>Sin {@link Pago} (venta manual o de tienda) se registra uno {@value Constants#PROVEEDOR_MANUAL}
 *       CAPTURADO con el mismo monto del pedido: es la marca que mira el despacho (SEC-09).</li>
 *   <li>Si hay un {@link Pago} SINPE pendiente, se captura y se confirma por el mismo camino que la
 *       aprobación de comprobantes ({@link PaymentService#confirmarPedido}): todo el grupo pasa a PAGADO,
 *       se consumen las reservas y la billetera se acredita después del commit.</li>
 *   <li>Un pago que cubre pedidos de otros negocios solo lo confirma un ADMIN.</li>
 *   <li>Efectivo con retiro en tienda: {@code PENDIENTE_COMPROBANTE → ENTREGADO} registra el cobro
 *       ({@link #confirmarCobroAlRetirar}).</li>
 *   <li>Siempre queda auditado (EMPRENDEDOR o ADMIN): usuario, empresa, pedido, estado anterior y
 *       nuevo, método y referencia.</li>
 * </ul>
 */
@Service
public class PedidoPagoManualService {

    public static final int LARGO_MAXIMO_REFERENCIA = 100;
    public static final String ACCION_AUDITORIA = "PEDIDO_PAGO_MANUAL";

    /** Métodos que se cobran fuera de la pasarela y por eso se pueden confirmar a mano. */
    static final Set<String> METODOS_MANUALES = Set.of(
        "EFECTIVO", "CONTRA_ENTREGA", Constants.PROVEEDOR_SINPE, "SINPE_MOVIL", "TRANSFERENCIA");

    /** Único método que se cobra al retirar: con retiro en tienda pasa a ENTREGADO sin PAGADO previo. */
    static final Set<String> METODOS_COBRO_AL_RETIRAR = Set.of("EFECTIVO");
    static final String METODO_EFECTIVO = "EFECTIVO";

    /** Estados de una venta manual ya pagada que todavía se puede despachar. */
    static final Set<String> ESTADOS_PAGADOS_DESPACHABLES = Set.of(
        Constants.PEDIDO_PAGADO, Constants.PEDIDO_CONFIRMADO, Constants.PEDIDO_PREPARANDO,
        Constants.PEDIDO_EN_PREPARACION, Constants.PEDIDO_LISTO_RETIRO);

    public static final String MENSAJE_METODO_NO_MANUAL =
        "Este pedido no se puede marcar como pagado a mano: solo los pagos en efectivo, SINPE o transferencia. "
            + "Los pagos con tarjeta los confirma la pasarela.";
    public static final String MENSAJE_PAGO_PASARELA =
        "Este pedido se paga con %s: el pago lo confirma la pasarela y no se puede marcar como pagado a mano.";
    public static final String MENSAJE_REFERENCIA_REQUERIDA =
        "Para marcar el pedido como pagado indicá la referencia del pago "
            + "(número de SINPE o de transferencia, o quién recibió el efectivo).";
    public static final String MENSAJE_REFERENCIA_LARGA =
        "La referencia del pago no puede superar " + LARGO_MAXIMO_REFERENCIA + " caracteres.";
    public static final String MENSAJE_GRUPO_OTROS_NEGOCIOS =
        "Este pago incluye pedidos de otros negocios; solo HotClick puede confirmarlo.";
    public static final String MENSAJE_PAGO_CERRADO = "El pago ya fue %s y no se puede confirmar.";

    private static final Pattern CONTROL = Pattern.compile("\\p{Cntrl}");

    @Autowired private PedidoGrupoService pedidoGrupoService;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private ComprobanteSinpeRepository comprobanteRepository;
    @Autowired @Lazy private PaymentService paymentService;
    @Autowired private AuditoriaAdminRegistroService auditoria;
    @Autowired private CompanyScope companyScope;

    /**
     * Confirma el pago de {@code pedido} (que está en un estado sin pago confirmado). Deja el pedido
     * en PAGADO o lanza {@link IllegalArgumentException}/{@link IllegalStateException} (400) sin tocar nada.
     */
    @Transactional
    public void confirmar(Pedido pedido, String estadoAnterior, String referenciaCruda) {
        String metodo = normalizarMetodo(pedido.getMetodoPago());
        Optional<Pago> pagoOpt = pagoSinPasarela(pedido);
        if (!METODOS_MANUALES.contains(metodo)) {
            throw new IllegalArgumentException(MENSAJE_METODO_NO_MANUAL);
        }

        String referencia = limpiarReferencia(referenciaCruda);
        ComprobanteSinpe comprobante = null;
        if (referencia == null) {
            comprobante = comprobantePendiente(pedido).orElseThrow(
                () -> new IllegalArgumentException(MENSAJE_REFERENCIA_REQUERIDA));
        }
        capturarPago(pedido, pagoOpt);
        Usuario actor = companyScope.getCurrentUser();
        if (pagoOpt.isEmpty()) {
            registrarPagoManual(pedido, metodo, actor);
        }

        if (comprobante != null) {
            comprobante.setEstado(Constants.COMPROBANTE_APROBADO);
            comprobante.setFechaResolucion(LocalDateTime.now(Constants.ZONA_CR));
            comprobante.setAdminId(actor != null ? actor.getId() : null);
            comprobante.setAdminEmail(actor != null ? actor.getCorreo() : null);
            comprobanteRepository.save(comprobante);
        }

        pedido.setEstadoPedido(Constants.PEDIDO_PAGADO);
        String evidencia = referencia != null ? "ref: " + referencia : "comprobante SINPE #" + comprobante.getId();
        auditar(pedido, estadoAnterior, Constants.PEDIDO_PAGADO, metodo, evidencia);
    }

    /**
     * Efectivo con retiro en tienda (nace PENDIENTE_COMPROBANTE): el cliente paga al retirar, así que
     * {@code PENDIENTE_COMPROBANTE → ENTREGADO} es a la vez el cobro. El Pago queda CAPTURADO con
     * método EFECTIVO. Si el checkout dejó un {@link Pago} manual
     * pendiente, se captura y se confirma igual que en {@link #confirmar} (stock, billetera); siempre
     * queda auditado. La referencia es opcional.
     */
    @Transactional
    public void confirmarCobroAlRetirar(Pedido pedido, String estadoAnterior, String referenciaCruda) {
        if (!esEfectivoConRetiro(pedido)) {
            throw new IllegalArgumentException(String.format(PedidoEstadoMaquina.MENSAJE_PRIMERO_PAGO,
                estadoAnterior, Constants.PEDIDO_ENTREGADO));
        }
        String referencia = limpiarReferencia(referenciaCruda);
        Optional<Pago> pagoOpt = pagoSinPasarela(pedido);
        pagoOpt.ifPresent(p -> p.setMetodoPagoTipo(METODO_EFECTIVO));
        capturarPago(pedido, pagoOpt);
        if (pagoOpt.isEmpty()) {
            registrarPagoManual(pedido, METODO_EFECTIVO, companyScope.getCurrentUser());
        }
        pedido.setEstadoPedido(Constants.PEDIDO_ENTREGADO);
        auditar(pedido, estadoAnterior, Constants.PEDIDO_ENTREGADO, normalizarMetodo(pedido.getMetodoPago()),
            "cobro en efectivo al retirar" + (referencia != null ? " · ref: " + referencia : ""));
    }

    /** Efectivo con retiro en tienda. */
    public static boolean esEfectivoConRetiro(Pedido pedido) {
        String metodo = normalizarMetodo(pedido.getMetodoPago());
        return METODOS_COBRO_AL_RETIRAR.contains(metodo)
            && Constants.ENVIO_RETIRO.equalsIgnoreCase(pedido.getMetodoEnvio() == null ? "" : pedido.getMetodoEnvio().trim());
    }

    /** El Pago del grupo, si existe; 400 si es de pasarela (tarjeta). */
    private Optional<Pago> pagoSinPasarela(Pedido pedido) {
        Optional<Pago> pagoOpt = pedidoGrupoService.pagoDelGrupo(pedido);
        if (pagoOpt.isPresent() && !esPagoManual(pagoOpt.get())) {
            throw new IllegalArgumentException(String.format(MENSAJE_PAGO_PASARELA,
                normalizarMetodo(pagoOpt.get().getProveedor())));
        }
        return pagoOpt;
    }

    /** Captura el Pago manual pendiente y confirma el grupo (PAGADO, reservas, billetera). */
    private void capturarPago(Pedido pedido, Optional<Pago> pagoOpt) {
        if (pagoOpt.isEmpty()) return;
        Pago pago = pagoOpt.get();
        verificarGrupoPropio(pedido);
        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) return;
        if (!Constants.PAGO_PENDIENTE.equals(pago.getEstadoPago())) {
            throw new IllegalStateException(String.format(MENSAJE_PAGO_CERRADO,
                String.valueOf(pago.getEstadoPago()).toLowerCase(Locale.ROOT)));
        }
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.save(pago);
        paymentService.confirmarPedido(pago);
    }

    private void auditar(Pedido pedido, String anterior, String nuevo, String metodo, String evidencia) {
        auditoria.registrar(ACCION_AUDITORIA, "PEDIDO", pedido.getId(), pedido.getEmpresaId(),
            String.format("Pedido %s: %s → %s · método %s · %s",
                pedido.getNumeroPedido(), anterior, nuevo, metodo, evidencia));
    }

    /**
     * Venta manual creada ya pagada ({@code PedidoManualFactory}): deja el {@link Pago} manual CAPTURADO
     * que habilita el despacho y la auditoría. Solo para métodos manuales y estados después del pago que
     * todavía se despachan; si no, no hace nada (el pedido se confirma después con referencia).
     */
    @Transactional
    public void registrarPagoAlCrear(Pedido pedido) {
        String metodo = normalizarMetodo(pedido.getMetodoPago());
        String estado = PedidoDespachoPolicy.normalizar(pedido.getEstadoPedido());
        if (!METODOS_MANUALES.contains(metodo) || !ESTADOS_PAGADOS_DESPACHABLES.contains(estado)) return;
        if (pedidoGrupoService.pagoDelGrupo(pedido).isPresent()) return;
        Usuario actor = companyScope.getCurrentUser();
        registrarPagoManual(pedido, metodo, actor);
        auditar(pedido, "(nuevo)", estado, metodo, "venta manual registrada como pagada al crearla");
    }

    /** Pago registrado a mano: proveedor MANUAL, CAPTURADO, mismo monto que el pedido (no cambia montos). */
    private void registrarPagoManual(Pedido pedido, String metodo, Usuario actor) {
        Usuario titular = pedido.getUsuarioFinal() != null ? pedido.getUsuarioFinal() : actor;
        if (titular == null) {
            throw new IllegalStateException("No se pudo registrar el pago: el pedido no tiene cliente.");
        }
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        Pago pago = new Pago();
        pago.setMerchantToken("MANUAL-" + UUID.randomUUID());
        pago.setMonto(pedido.getTotalPedido() != null ? pedido.getTotalPedido() : 0);
        pago.setMoneda("CRC");
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pago.setProveedor(Constants.PROVEEDOR_MANUAL);
        pago.setMetodoPagoTipo(metodo.length() > 30 ? metodo.substring(0, 30) : metodo);
        pago.setFechaCreacion(ahora);
        pago.setFechaActualizacion(ahora);
        pago.setPedido(pedido);
        pago.setUsuario(titular);
        pago.setEstado(Constants.ESTADO_ACTIVO);
        pagoRepository.save(pago);
    }

    static boolean esPagoManual(Pago pago) {
        return Constants.PROVEEDOR_SINPE.equalsIgnoreCase(pago.getProveedor())
            || Constants.PROVEEDOR_MANUAL.equalsIgnoreCase(pago.getProveedor());
    }

    static String normalizarMetodo(String metodo) {
        if (metodo == null) return "";
        return metodo.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
    }

    /** null si viene vacía; 400 si supera el largo máximo. Quita caracteres de control. */
    static String limpiarReferencia(String referencia) {
        if (referencia == null) return null;
        String limpia = CONTROL.matcher(referencia).replaceAll("").trim();
        if (limpia.isEmpty()) return null;
        if (limpia.length() > LARGO_MAXIMO_REFERENCIA) {
            throw new IllegalArgumentException(MENSAJE_REFERENCIA_LARGA);
        }
        return limpia;
    }

    private Optional<ComprobanteSinpe> comprobantePendiente(Pedido pedido) {
        if (pedido.getId() == null) return Optional.empty();
        return comprobanteRepository.findByPedidoId(pedido.getId())
            .filter(c -> Constants.COMPROBANTE_PENDIENTE.equals(c.getEstado()));
    }

    private void verificarGrupoPropio(Pedido pedido) {
        if (companyScope.isAdminIT()) return;
        boolean ajeno = pedidoGrupoService.delGrupo(pedido).stream()
            .anyMatch(p -> !Objects.equals(p.getEmpresaId(), pedido.getEmpresaId()));
        if (ajeno) throw new IllegalArgumentException(MENSAJE_GRUPO_OTROS_NEGOCIOS);
    }
}

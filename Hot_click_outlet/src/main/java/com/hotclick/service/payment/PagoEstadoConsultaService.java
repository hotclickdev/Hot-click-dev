package com.hotclick.service.payment;

import com.hotclick.dto.PaymentStatusResponse;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.PaymentService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

/**
 * Estado del pago para la página «Verificando el pago». Si el pago ONVO sigue PENDIENTE, le pregunta a
 * ONVO con la misma verificación que usan el webhook y el cleanup ({@link OnvoPaymentProvider#procesarPagoVerificado}),
 * a lo sumo una vez cada {@code hotclick.pagos.onvo.estado-reconsulta-segundos} por pago.
 *
 * <ul>
 *   <li>Solo el dueño: correo autenticado igual al del comprador, o el token firmado del checkout
 *       (invitados). Cualquier otro recibe el mismo «Pedido no encontrado».</li>
 *   <li>Fail-closed: si ONVO falla o tarda, el estado queda como esté en la base (PENDIENTE). Solo la
 *       captura verificada de {@code procesarPagoVerificado} lo pasa a CAPTURADO.</li>
 *   <li>Idempotente con el webhook: la captura usa el mismo candado y la misma marca por sesión.</li>
 *   <li>Sin transacción abierta mientras se consulta a ONVO.</li>
 * </ul>
 */
@Service
public class PagoEstadoConsultaService {

    private static final Logger log = LoggerFactory.getLogger(PagoEstadoConsultaService.class);
    static final String ORIGEN = "estado";
    private static final int MAX_ENTRADAS = 10_000;

    @Autowired private PedidoRepository        pedidoRepository;
    @Autowired private PedidoGrupoService      pedidoGrupoService;
    @Autowired private PaymentService          paymentService;
    @Autowired private OnvoPaymentProvider     onvoPaymentProvider;
    @Autowired private GuestCancelTokenService guestCancelTokenService;
    @Autowired private PlatformTransactionManager transactionManager;

    @Value("${hotclick.pagos.onvo.estado-reconsulta-segundos:10}")
    private long reconsultaSegundos = 10;

    /** Última reconsulta a ONVO por pago (epoch ms). */
    private final Map<Long, Long> ultimaReconsulta = new ConcurrentHashMap<>();
    LongSupplier reloj = System::currentTimeMillis;

    record Objetivo(Long pagoId, String merchantToken, boolean reconsultable) {}

    public PaymentStatusResponse consultar(String numeroPedido, String correoUsuario, String tokenPedido) {
        Objetivo obj = leer(numeroPedido, correoUsuario, tokenPedido);
        if (obj.reconsultable() && permitir(obj.pagoId())) {
            try {
                OnvoPaymentProvider.Verificacion v = onvoPaymentProvider.procesarPagoVerificado(obj.merchantToken(), ORIGEN);
                log.debug("[pago-estado] Reconsulta ONVO pago id={}: {}", obj.pagoId(), v);
            } catch (Exception e) {
                // Fail-closed: no se marca nada; el estado sigue el de la base.
                log.warn("[pago-estado] Reconsulta ONVO falló pago id={}: {}", obj.pagoId(), e.getClass().getSimpleName());
            }
        }
        return paymentService.consultarEstado(numeroPedido);
    }

    private Objetivo leer(String numeroPedido, String correoUsuario, String tokenPedido) {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.setReadOnly(true);
        return tx.execute(s -> {
            Pedido pedido = pedidoRepository.findByNumeroPedido(numeroPedido)
                .filter(p -> esDueno(p, numeroPedido, correoUsuario, tokenPedido))
                .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Pedido no encontrado",
                    "pedido=" + RecursoNoEncontradoException.enmascarar(numeroPedido)));
            Pago pago = pedidoGrupoService.pagoDelGrupo(pedido).orElse(null);
            if (pago == null) return new Objetivo(null, null, false);
            boolean reconsultable = Constants.PROVEEDOR_ONVO.equalsIgnoreCase(pago.getProveedor())
                && Constants.PAGO_PENDIENTE.equals(pago.getEstadoPago())
                && pago.getMerchantToken() != null && !pago.getMerchantToken().isBlank();
            return new Objetivo(pago.getId(), pago.getMerchantToken(), reconsultable);
        });
    }

    private boolean esDueno(Pedido pedido, String numeroPedido, String correoUsuario, String tokenPedido) {
        if (tokenPedido != null && !tokenPedido.isBlank() && guestCancelTokenService.esValido(numeroPedido, tokenPedido)) {
            return true;
        }
        if (correoUsuario == null || "anonymousUser".equals(correoUsuario)) return false;
        String dueno = pedido.getUsuarioFinal() == null ? null : pedido.getUsuarioFinal().getCorreo();
        return dueno != null && dueno.trim().equalsIgnoreCase(correoUsuario.trim());
    }

    /** Límite por pago: una reconsulta cada {@code reconsultaSegundos}. */
    boolean permitir(Long pagoId) {
        if (pagoId == null) return false;
        long ahora = reloj.getAsLong();
        long ventana = Math.max(1, reconsultaSegundos) * 1000L;
        if (ultimaReconsulta.size() > MAX_ENTRADAS) {
            ultimaReconsulta.entrySet().removeIf(e -> ahora - e.getValue() >= ventana);
        }
        boolean[] permitido = {false};
        ultimaReconsulta.compute(pagoId, (k, previo) -> {
            if (previo == null || ahora - previo >= ventana) {
                permitido[0] = true;
                return ahora;
            }
            return previo;
        });
        return permitido[0];
    }
}

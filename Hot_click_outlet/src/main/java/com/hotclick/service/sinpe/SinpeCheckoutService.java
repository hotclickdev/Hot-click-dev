package com.hotclick.service.sinpe;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.model.Bodega;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PagoRepository;
import com.hotclick.service.payment.CheckoutGrupoFactory;
import com.hotclick.service.payment.CheckoutValidator;
import com.hotclick.service.payment.GuestCancelTokenService;
import com.hotclick.service.payment.GuestUserResolver;
import com.hotclick.service.payment.StockReservationResult;
import com.hotclick.service.payment.StockReservationService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Checkout SINPE: igual que el de tarjeta (un pago por grupo, un subpedido por bodega),
 * pero el Pago queda PENDIENTE hasta que el cliente sube el comprobante y un admin lo aprueba.
 */
@Service
public class SinpeCheckoutService {

    private static final Logger log = LoggerFactory.getLogger(SinpeCheckoutService.class);

    @Autowired private PagoRepository            pagoRepository;
    @Autowired private CheckoutValidator         checkoutValidator;
    @Autowired private GuestUserResolver         guestUserResolver;
    @Autowired private StockReservationService   stockReservationService;
    @Autowired private CheckoutGrupoFactory      checkoutGrupoFactory;
    @Autowired private GuestCancelTokenService   guestCancelTokenService;
    @Autowired private com.hotclick.service.pedido.AutocompraNegocioGuard autocompraGuard;
    @Autowired private com.hotclick.service.payment.ReservaAntiBotService reservaAntiBot;
    @Autowired private com.hotclick.service.analytics.AtribucionPedidoService atribucionPedidoService;

    @Autowired(required = false) private com.hotclick.service.envio.ContraEntregaPolitica contraEntregaPolitica;
    @Autowired(required = false) private com.hotclick.service.OnvoService onvoService;

    public static final String MSG_SINPE_SIN_DESTINO =
        "SINPE Móvil no está disponible por ahora. Pagá con Tarjeta.";

    /** Decisión HOT_CLICK 16-oct-2026: sin SINPE manual con comprobante; solo botones de pasarela (y efectivo). */
    @org.springframework.beans.factory.annotation.Value("${hotclick.checkout.sinpe-manual.habilitado:false}")
    private boolean sinpeManualHabilitado;

    /** Decisión 24-oct-2026: el efectivo (y contra entrega) queda solo en el POS. Default false = el checkout web lo rechaza. */
    @org.springframework.beans.factory.annotation.Value("${hotclick.checkout.efectivo-web.habilitado:false}")
    private boolean efectivoWebHabilitado;

    public static final String MSG_EFECTIVO_SOLO_POS =
        "El pago en efectivo es solo en tienda (POS). En línea pagá con Tarjeta.";

    /** Checkout web: EFECTIVO solo con la bandera; el resto sigue la regla G1 de {@link #exigirProveedorPermitido(String, boolean)}. */
    static void exigirProveedorPermitido(String proveedor, boolean sinpeManualHabilitado, boolean efectivoWebHabilitado) {
        if (!efectivoWebHabilitado && proveedor != null && "EFECTIVO".equalsIgnoreCase(proveedor.trim())) {
            throw new IllegalStateException(MSG_EFECTIVO_SOLO_POS);
        }
        exigirProveedorPermitido(proveedor, sinpeManualHabilitado);
    }

    public static final String MSG_SINPE_MANUAL =
        "Este checkout solo registra pagos en efectivo. Elegí SINPE Móvil o Tarjeta: te llevamos a la pasarela de pago.";

    static void exigirProveedorPermitido(String proveedor, boolean sinpeManualHabilitado) {
        // G1: sin la bandera legacy esta ruta solo registra EFECTIVO. Cualquier otro valor (SINPE, null,
        // TRANSFERENCIA, ONVO...) crearía un Pago SINPE pendiente confirmable a mano.
        if (!sinpeManualHabilitado && (proveedor == null || !"EFECTIVO".equalsIgnoreCase(proveedor.trim()))) {
            throw new IllegalStateException(MSG_SINPE_MANUAL);
        }
    }

    @Transactional
    public PaymentCheckoutResponse checkout(PaymentCheckoutRequest req, String correoUsuario) {
        exigirProveedorPermitido(req.getProvider(), sinpeManualHabilitado, efectivoWebHabilitado);
        String sinpeDestino = exigirDestinoSiSinpe(req.getProvider(), onvoService != null ? onvoService.sinpeDestino() : "");
        checkoutValidator.validateCartNotEmpty(req);
        String emailEfectivo = checkoutValidator.resolveEffectiveEmail(correoUsuario, req);
        Usuario usuario = guestUserResolver.resolve(emailEfectivo, req.getGuestPhone());

        Bodega bodegaDefault = checkoutValidator.resolverBodegaDefault(req.getBodegaId());

        StockReservationResult reservation = stockReservationService.reserveForCheckout(req.getItems());
        String proveedorEfectivo = req.getProvider() != null ? req.getProvider().trim() : Constants.PROVEEDOR_SINPE;
        CheckoutGrupoFactory.Grupo grupo = checkoutGrupoFactory.crear(
            req, reservation, bodegaDefault, proveedorEfectivo, usuario, Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        Pedido principal = grupo.principal();
        // G1b: el comprador (con sesion, o invitado identificado por su correo) no puede ser del negocio vendedor.
        autocompraGuard.exigirNoEsDelNegocio(usuario, grupo.pedidos());
        autocompraGuard.exigirCorreoNoEsDelNegocio(emailEfectivo, grupo.pedidos());
        exigirEfectivoAceptado(proveedorEfectivo, grupo.pedidos(),
            contraEntregaPolitica == null || contraEntregaPolitica.habilitada());
        atribucionPedidoService.guardarSiPresente(principal, req.getAtribucion());

        // SINPE es manual: no fechaExpiracion; el cleanup TTL excluye este proveedor.
        Pago pago = new Pago();
        pago.setMerchantToken("SINPE-" + UUID.randomUUID());
        pago.setMonto(grupo.totalCobro());
        pago.setMoneda("CRC");
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setProveedor(Constants.PROVEEDOR_SINPE);
        pago.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pago.setPedido(principal);
        pago.setUsuario(usuario);
        pago.setEstado(Constants.ESTADO_ACTIVO);
        pago = pagoRepository.save(pago);
        boolean invitado = correoUsuario == null || "anonymousUser".equals(correoUsuario);
        reservaAntiBot.registrar(usuario, invitado, req, grupo.pedidos(), pago);

        log.info("Checkout {} iniciado: pedido={} paquetes={} total={}",
            proveedorEfectivo, principal.getNumeroPedido(), grupo.subpedidos().size(), grupo.totalCobro());

        PaymentCheckoutResponse response = new PaymentCheckoutResponse(
            principal.getId(), principal.getNumeroPedido(),
            null, Constants.PAGO_PENDIENTE, grupo.totalCobro(), proveedorEfectivo);
        response.setSinpeDestino(sinpeDestino);
        response.setCancelToken(guestCancelTokenService.emitir(principal.getNumeroPedido()));
        response.setPaquetes(CheckoutGrupoFactory.resumen(grupo.pedidos()));
        return response;
    }

    /**
     * Fail-closed antes de reservar stock: SINPE manual sin destino ONVO configurado no crea pedido.
     * Devuelve el destino para SINPE y null para efectivo.
     */
    static String exigirDestinoSiSinpe(String proveedor, String destino) {
        if (proveedor != null && "EFECTIVO".equalsIgnoreCase(proveedor.trim())) return null;
        if (destino == null || destino.isBlank()) throw new IllegalStateException(MSG_SINPE_SIN_DESTINO);
        return destino;
    }

    /** Efectivo solo si todas las bodegas del pedido lo aceptan; si no, se revierte la transacción. */
    static void exigirEfectivoAceptado(String proveedor, java.util.List<Pedido> pedidos) {
        exigirEfectivoAceptado(proveedor, pedidos, false);
    }

    /** Efectivo: la bodega lo acepta, o el paquete va por Envío Normal contra entrega (configurable). */
    static void exigirEfectivoAceptado(String proveedor, java.util.List<Pedido> pedidos, boolean contraEntregaNormal) {
        if (!"EFECTIVO".equalsIgnoreCase(proveedor)) return;
        boolean todas = pedidos.stream()
            .allMatch(p -> com.hotclick.service.envio.ContraEntregaPolitica.permiteEfectivo(
                p.getBodega() != null && Boolean.TRUE.equals(p.getBodega().getAceptaEfectivo()),
                p.getMetodoEnvio(), contraEntregaNormal));
        if (!todas) {
            throw new IllegalStateException("Algún negocio de tu carrito no acepta efectivo. Pagá con SINPE / Tarjeta.");
        }
    }
}

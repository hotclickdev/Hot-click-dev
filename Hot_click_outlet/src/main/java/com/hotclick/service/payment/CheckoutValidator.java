package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Bodega;
import com.hotclick.payment.PaymentProviderFactory;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class CheckoutValidator {

    private static final Logger log = LoggerFactory.getLogger(CheckoutValidator.class);

    /**
     * Métodos de envío que puede elegir el comprador en el checkout (restaurado de antes del merge 89c1795b2).
     * Un valor fuera de la lista caía en el {@code default -> 0} de {@code OrderPricingService.calcularCostoEnvio}
     * (envío gratis). ENVIO_A_DOMICILIO queda solo para pedidos manuales del panel ({@code PedidoManualFactory}).
     */
    static final Set<String> METODOS_ENVIO_CHECKOUT = Set.of(
        Constants.ENVIO_RETIRO, Constants.ENVIO_ENCOMIENDA,
        "ENVIO_NORMAL_GAM", "ENVIO_NORMAL_FUERA_GAM", "ENVIO_RAPIDO");

    @Autowired private BodegaRepository bodegaRepository;

    @Value("${payments.onvo.enabled:false}")
    private boolean onvoEnabled;

    public void validateCartNotEmpty(PaymentCheckoutRequest req) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new IllegalArgumentException("El carrito no tiene productos");
        }
    }

    /**
     * Allowlist del checkout público. STRIPE queda fuera; ONVO solo con hotclick.onvo flag. SINPE queda fuera
     * (G1): solo existe dentro de la pasarela ONVO; un Pago SINPE propio sería confirmable a mano.
     */
    static final java.util.Set<String> PROVEEDORES_CHECKOUT = java.util.Set.of(
        Constants.PROVEEDOR_TILOPAY, Constants.PROVEEDOR_ONVO);

    public String resolveProvider(PaymentCheckoutRequest req, PaymentProviderFactory providerFactory) {
        if (req.getProvider() == null || req.getProvider().isBlank()) {
            throw new IllegalArgumentException("Elegí un método de pago");
        }
        String provider = req.getProvider().trim().toUpperCase();
        if (Constants.PROVEEDOR_ONVO.equals(provider) && !onvoEnabled) {
            throw new IllegalArgumentException(
                "ONVO no está habilitado. Usá TILOPAY para pagos con tarjeta.");
        }
        if (!PROVEEDORES_CHECKOUT.contains(provider) || !providerFactory.soporta(provider)) {
            throw new IllegalArgumentException("Proveedor de pago no soportado: " + provider);
        }
        return provider;
    }

    public String resolveEffectiveEmail(String correoUsuario, PaymentCheckoutRequest req) {
        // Invitado: correoUsuario viene vacío, usar guestEmail del request
        String emailEfectivo = (correoUsuario != null && !correoUsuario.equals("anonymousUser"))
            ? correoUsuario : req.getGuestEmail();
        if (emailEfectivo == null || emailEfectivo.isBlank()) {
            throw new IllegalArgumentException("Se requiere correo electrónico para procesar el pedido");
        }
        return emailEfectivo;
    }

    public Bodega loadBodega(Long bodegaId) {
        return bodegaRepository.findById(bodegaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Bodega", bodegaId));
    }

    /**
     * Bodega por defecto del checkout. Si el body trae {@code bodegaId}, es estricta (404 si no existe).
     * Si no, intenta la bodega HotClick (id 1) y, si ya no existe (reset de datos), la primera bodega
     * activa del negocio activo o de la plataforma. Puede devolver null: los productos con bodega propia
     * o de su tienda no la necesitan, y el planner falla con un mensaje claro si alguno sí la necesita.
     */
    public Bodega resolverBodegaDefault(Long bodegaIdSolicitada) {
        boolean esDefault = bodegaIdSolicitada == null || java.util.Objects.equals(bodegaIdSolicitada, Constants.BODEGA_DEFAULT_ID);
        // El front manda bodegaId=1 (BODEGA_DEFAULT) en todo envío: si ya no existe, se trata como ausente.
        if (!esDefault) return loadBodega(bodegaIdSolicitada);
        java.util.Optional<Bodega> fija = bodegaRepository.findById(Constants.BODEGA_DEFAULT_ID);
        if (fija.isPresent()) return fija.get();
        Long tenantId = com.hotclick.security.TenantContext.get();
        Long empresaId = tenantId != null ? tenantId : Constants.EMPRESA_PLATAFORMA_ID;
        java.util.List<Bodega> activas =
            bodegaRepository.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(empresaId, Constants.ESTADO_ACTIVO);
        if (activas != null && !activas.isEmpty()) return activas.get(0);
        log.warn("[checkout] Sin bodega default: id {} no existe y la empresa {} no tiene bodegas activas",
            Constants.BODEGA_DEFAULT_ID, empresaId);
        return null;
    }

    public void assertBodegaTenant(Bodega bodega, Long bodegaId) {
        assertBodegaTenant(bodega, bodegaId, java.util.Set.of());
    }

    /**
     * Tenant assertion: la bodega del checkout debe pertenecer al negocio activo (TenantContext) o, en el
     * marketplace (E2E-CMP-01), a la empresa vendedora de los productos de ese paquete. En /api/payments el
     * TenantContext sale del JWT del comprador: una cuenta de negocio que compra en otra tienda no es el vendedor.
     * Fail-closed: una bodega que no es del negocio activo ni del vendedor se rechaza con 400 (IllegalArgumentException).
     */
    public void assertBodegaTenant(Bodega bodega, Long bodegaId, java.util.Collection<Long> empresasVendedoras) {
        Long tenantId = com.hotclick.security.TenantContext.get();
        if (tenantId == null) return;
        Long bodegaEmpresaId = bodega.getEmpresa() != null ? bodega.getEmpresa().getId() : null;
        if (tenantId.equals(bodegaEmpresaId)) return;
        if (bodegaEmpresaId != null && empresasVendedoras != null && empresasVendedoras.contains(bodegaEmpresaId)) return;
        log.warn("[checkout] Bodega ajena bloqueada: tenant={}, bodegaId={}, bodega.empresaId={}, vendedores={}",
            tenantId, bodegaId, bodegaEmpresaId, empresasVendedoras);
        throw new IllegalArgumentException("La bodega seleccionada no pertenece a esta tienda");
    }

    public static void assertMetodoEnvioValido(String metodoEnvio) {
        if (metodoEnvio == null) return; // el planner usa RETIRO_EN_TIENDA por defecto
        if (!METODOS_ENVIO_CHECKOUT.contains(metodoEnvio)) {
            throw new IllegalArgumentException("Método de envío no válido: " + metodoEnvio);
        }
    }

    /**
     * Valida el envío de un paquete: el método tiene que ser uno del checkout y, si es retiro en tienda,
     * la bodega de origen de ese paquete tiene que permitirlo.
     */
    public void validarRetiroPaquete(String metodoEnvio, Bodega bodega) {
        assertMetodoEnvioValido(metodoEnvio);
        if (Constants.ENVIO_RETIRO.equals(metodoEnvio) && !Boolean.TRUE.equals(bodega.getPermiteRetiroCliente())) {
            String tienda = bodega.getEmpresa() != null && bodega.getEmpresa().getNombreEmpresa() != null
                ? bodega.getEmpresa().getNombreEmpresa() : bodega.getNombreBodega();
            throw new IllegalStateException(tienda + " no tiene habilitado el retiro en tienda");
        }
    }
}

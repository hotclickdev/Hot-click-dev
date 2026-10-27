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

import java.util.Locale;
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

    /** P-06 (C1): si algún paquete se envía (no es retiro), la dirección de entrega es obligatoria. */
    public static void exigirDireccionSiHayEnvio(PaymentCheckoutRequest req) {
        java.util.List<String> metodos = new java.util.ArrayList<>();
        metodos.add(req.getMetodoEnvio());
        if (req.getEnvios() != null) {
            req.getEnvios().stream().filter(java.util.Objects::nonNull)
                .forEach(e -> metodos.add(e.getMetodoEnvio()));
        }
        metodos.forEach(CheckoutValidator::assertMetodoEnvioValido);
        boolean hayEnvio = metodos.stream().anyMatch(m -> !CheckoutOrderFactory.esRetiro(m));
        if (hayEnvio && CheckoutOrderFactory.direccionDeEntrega(req.getDireccionEntrega(), Constants.ENVIO_ENCOMIENDA) == null) {
            throw new IllegalArgumentException("Ingresá la dirección de entrega para el envío.");
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
        String provider = req.getProvider().trim().toUpperCase(Locale.ROOT);
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
     * Bodega por defecto del checkout. Si el body trae {@code bodegaId} (cualquiera, incluida la 1), es
     * estricta: 404 si no existe (P-08). Si no, la primera bodega activa del negocio activo o, sin tenant,
     * de la plataforma. Puede devolver null: los productos con bodega propia o de su tienda no la necesitan,
     * y el planner falla con un mensaje claro si alguno sí la necesita.
     */
    public Bodega resolverBodegaDefault(Long bodegaIdSolicitada) {
        if (bodegaIdSolicitada != null) return loadBodega(bodegaIdSolicitada);
        Long tenantId = com.hotclick.security.TenantContext.get();
        Long empresaId = tenantId != null ? tenantId : Constants.EMPRESA_PLATAFORMA_ID;
        java.util.List<Bodega> activas =
            bodegaRepository.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(empresaId, Constants.ESTADO_ACTIVO);
        if (activas != null && !activas.isEmpty()) return activas.get(0);
        log.warn("[checkout] Sin bodega default: la empresa {} no tiene bodegas activas", empresaId);
        return null;
    }

    public void assertBodegaTenant(Bodega bodega, Long bodegaId) {
        assertBodegaTenant(bodega, bodegaId, java.util.Set.of());
    }

    /**
     * Tenant assertion (E2E-CMP-01 + NO APTO #321 x2). La bodega de un paquete se acepta solo si TODOS sus
     * ítems son de un único vendedor y la bodega es de ese vendedor
     * ({@code empresasVendedoras == Set.of(bodega.empresa)}), sea cual sea el tenant: también en la tienda
     * propia (tenant A + carrito A+B en la bodega de A da 400). Un ítem sin empresa llega como null y se rechaza.
     * <p>
     * Única excepción (BAJO aceptado por Seguridad, decisión 1): invitado/comprador sin negocio
     * (TenantContext null) y bodega HotClick (empresa plataforma o sin empresa): HotClick coordina el despacho
     * de productos de terceros sin bodega propia (fallback a bodegaDefault). Sin cambio respecto a master.
     * <p>
     * Fail-closed: cualquier otro caso, o paquete sin bodega, da 400 (IllegalArgumentException).
     */
    public void assertBodegaTenant(Bodega bodega, Long bodegaId, java.util.Collection<Long> empresasVendedoras) {
        if (bodega == null) throw new IllegalArgumentException("El paquete no tiene bodega de despacho");
        Long tenantId = com.hotclick.security.TenantContext.get();
        Long bodegaEmpresaId = bodega.getEmpresa() != null ? bodega.getEmpresa().getId() : null;
        // BAJO aceptado (decisión 1): invitado + bodega HotClick.
        if (tenantId == null && (bodegaEmpresaId == null || Constants.esEmpresaPlataforma(bodegaEmpresaId))) return;
        if (bodegaEmpresaId != null && empresasVendedoras != null
                && new java.util.HashSet<>(empresasVendedoras).equals(java.util.Collections.singleton(bodegaEmpresaId))) return;
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

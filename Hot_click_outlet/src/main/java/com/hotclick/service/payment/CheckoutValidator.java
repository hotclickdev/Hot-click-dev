package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Bodega;
import com.hotclick.model.Producto;
import com.hotclick.payment.PaymentProviderFactory;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class CheckoutValidator {

    private static final Logger log = LoggerFactory.getLogger(CheckoutValidator.class);

    /** Métodos que ofrece el checkout del comprador; el domicilio a ₡2000 es solo de pedidos manuales. */
    private static final Set<String> METODOS_ENVIO_CHECKOUT = Set.of(
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

    public String resolveProvider(PaymentCheckoutRequest req, PaymentProviderFactory providerFactory) {
        String provider = req.getProvider() != null ? req.getProvider().toUpperCase() : "STRIPE";
        if (Constants.PROVEEDOR_ONVO.equals(provider) && !onvoEnabled) {
            throw new IllegalArgumentException(
                "ONVO no está habilitado. Usá TILOPAY para pagos con tarjeta.");
        }
        if (!providerFactory.soporta(provider)) {
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

    public Optional<Bodega> findBodega(Long bodegaId) {
        return bodegaRepository.findById(bodegaId);
    }

    public void assertBodegaTenant(Bodega bodega, Long bodegaId) {
        // Tenant assertion: la bodega del checkout debe pertenecer al negocio activo
        // (slug de la tienda pública). Evita que un pedido de la Empresa A se asiente
        // contra el inventario/empresa de la Bodega de la Empresa B.
        Long tenantId = com.hotclick.security.TenantContext.get();
        if (tenantId != null) {
            Long bodegaEmpresaId = bodega.getEmpresa() != null ? bodega.getEmpresa().getId() : null;
            if (!tenantId.equals(bodegaEmpresaId)) {
                log.warn("[checkout] Intento cross-tenant bloqueado: tenant={}, bodegaId={}, bodega.empresaId={}",
                    tenantId, bodegaId, bodegaEmpresaId);
                throw new SecurityException("La bodega seleccionada no pertenece a este negocio");
            }
        }
    }

    /**
     * Un método desconocido no puede caer en envío ₡0. Sin método el pedido queda como
     * retiro ({@code CheckoutOrderFactory}), igual que antes.
     */
    public static void assertMetodoEnvioValido(String metodoEnvio) {
        if (metodoEnvio == null) return;
        if (!METODOS_ENVIO_CHECKOUT.contains(metodoEnvio)) {
            throw new IllegalArgumentException("Método de envío no válido: " + metodoEnvio);
        }
    }

    public void validateRetiroEnTienda(String metodoEnvio, Bodega bodega, Long bodegaId,
                                       Map<Long, Producto> productosMap) {
        // ── Retiro en tienda: solo si la bodega lo habilita y el carrito completo
        //    pertenece a esa única bodega (evita "retiro gratis" en carritos multi-negocio).
        if (Constants.ENVIO_RETIRO.equals(metodoEnvio)) {
            if (!Boolean.TRUE.equals(bodega.getPermiteRetiroCliente())) {
                throw new IllegalStateException("Esta bodega no tiene habilitado el retiro en tienda");
            }
            boolean todosMismaBodega = productosMap.values().stream()
                .allMatch(p -> p.getBodega() != null && bodegaId.equals(p.getBodega().getId()));
            if (!todosMismaBodega) {
                throw new IllegalStateException("El retiro en tienda solo aplica cuando todos los productos son de la misma bodega");
            }
        }
    }
}

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

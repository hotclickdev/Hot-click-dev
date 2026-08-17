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
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class CheckoutValidator {

    private static final Logger log = LoggerFactory.getLogger(CheckoutValidator.class);

    @Autowired private BodegaRepository bodegaRepository;

    public void validateCartNotEmpty(PaymentCheckoutRequest req) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new IllegalArgumentException("El carrito no tiene productos");
        }
    }

    public String resolveProvider(PaymentCheckoutRequest req, PaymentProviderFactory providerFactory) {
        String provider = req.getProvider() != null ? req.getProvider().toUpperCase() : "STRIPE";
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

package com.hotclick.service.sinpe;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.security.CompanyScope;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Quién puede aprobar o rechazar un comprobante SINPE.
 * Admin de plataforma, o la tienda dueña del pedido. Nunca el comprador.
 */
@Component
public class SinpeAprobacionGuard {

    static final String PROPIA_COMPRA = "No tienes permiso para aprobar tu propia compra";
    static final String OTRA_TIENDA = "No tienes permiso para aprobar comprobantes de otra tienda";

    @Autowired
    private CompanyScope companyScope;

    public void assertPuedeResolver(Pedido pedido) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String correo = auth != null ? auth.getName() : null;
        assertReglas(pedido, correo, companyScope.getCurrentUserId(),
                companyScope.isAdminIT(), companyScope.getCurrentEmpresaId());
    }

    /**
     * Un pago que no existe no se revela a un vendedor: 403, no 404.
     * El admin de plataforma sí recibe 404.
     */
    public void assertPuedeResolverPago(Pago pago) {
        if (pago == null) {
            if (companyScope.isAdminIT()) {
                throw new RecursoNoEncontradoException("Pago no encontrado");
            }
            throw new SecurityException(OTRA_TIENDA);
        }
        assertPuedeResolver(pago.getPedido());
    }

    static void assertReglas(Pedido pedido, String correoActor, Long actorId,
                             boolean adminPlataforma, Long empresaActor) {
        if (esComprador(pedido, correoActor, actorId)) {
            throw new SecurityException(PROPIA_COMPRA);
        }
        if (adminPlataforma) {
            return;
        }
        Long empresaPedido = pedido != null ? pedido.getEmpresaId() : null;
        if (empresaActor == null || empresaPedido == null || !empresaActor.equals(empresaPedido)) {
            throw new SecurityException(OTRA_TIENDA);
        }
    }

    private static boolean esComprador(Pedido pedido, String correoActor, Long actorId) {
        if (pedido == null || pedido.getUsuarioFinal() == null) {
            return false;
        }
        Usuario comprador = pedido.getUsuarioFinal();
        if (actorId != null && actorId.equals(comprador.getId())) {
            return true;
        }
        if (correoActor == null || correoActor.isBlank() || comprador.getCorreo() == null) {
            return false;
        }
        return correoActor.equalsIgnoreCase(comprador.getCorreo().trim());
    }
}

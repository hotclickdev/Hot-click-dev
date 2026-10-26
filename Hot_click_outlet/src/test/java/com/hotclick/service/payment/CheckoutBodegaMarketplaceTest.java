package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.security.TenantContext;
import com.hotclick.service.GiftCardService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * E2E-CMP-01: comprador con cuenta de negocio (TenantContext = su empresa por JWT) que elige retiro en
 * otra tienda del marketplace. La bodega se valida contra la empresa vendedora del paquete; fail-closed.
 */
@DisplayName("E2E-CMP-01 | bodega del vendedor en el marketplace")
class CheckoutBodegaMarketplaceTest {

    /** Marca que la validación de bodegas pasó y el flujo siguió al cupón. */
    static class PasoValidacion extends RuntimeException {}

    private static final long COMPRADOR = 52L, VENDEDOR = 53L, TERCERA = 54L;

    @AfterEach void limpiar() { TenantContext.clear(); }

    private static Empresa empresa(long id) { Empresa e = new Empresa(); e.setId(id); return e; }
    private static Bodega bodega(long id, long empresaId) {
        Bodega b = new Bodega(); b.setId(id); b.setEmpresa(empresa(empresaId)); b.setPermiteRetiroCliente(true); return b;
    }

    private static void checkout(Long tenant, long empresaProducto, Bodega bodegaPaquete) {
        if (tenant != null) TenantContext.set(tenant);
        Producto p = new Producto(); p.setId(578L); p.setEmpresa(empresa(empresaProducto));
        PaymentCheckoutRequest.ItemDTO item = new PaymentCheckoutRequest.ItemDTO();
        item.setProductoId(578L); item.setCantidad(1);
        PaymentCheckoutRequest req = new PaymentCheckoutRequest();
        req.setItems(List.of(item)); req.setMetodoEnvio(Constants.ENVIO_RETIRO);

        CheckoutPaquetesPlanner planner = mock(CheckoutPaquetesPlanner.class);
        when(planner.planificar(any(), any(), any())).thenReturn(List.of(new CheckoutPaquetesPlanner.Paquete(
            bodegaPaquete, List.of(item), 1000, 500, Constants.ENVIO_RETIRO, null)));
        OrderPricingService pricing = mock(OrderPricingService.class);
        doThrow(new PasoValidacion()).when(pricing).exigirCuponValido(any(), any());
        CheckoutGrupoFactory f = new CheckoutGrupoFactory(new CheckoutValidator(), planner, pricing,
            mock(CheckoutOrderFactory.class), mock(GiftCardService.class));
        f.crear(req, new StockReservationResult(1000, 500, Map.of(578L, p)), null, "ONVO", null, "PENDIENTE");
    }

    @Test
    void compradorNegocioRetiraEnBodegaDelVendedor() {
        assertThatThrownBy(() -> checkout(COMPRADOR, VENDEDOR, bodega(60L, VENDEDOR))).isInstanceOf(PasoValidacion.class);
    }

    @Test
    void bodegaDeUnaTerceraTiendaSeRechazaCon400() {
        assertThatThrownBy(() -> checkout(COMPRADOR, VENDEDOR, bodega(61L, TERCERA)))
            .isInstanceOf(IllegalArgumentException.class).isNotInstanceOf(PasoValidacion.class);
    }

    @Test
    void flujoTenantEnTiendaPropiaNoCambia() {
        assertThatThrownBy(() -> checkout(COMPRADOR, COMPRADOR, bodega(62L, COMPRADOR))).isInstanceOf(PasoValidacion.class);
        assertThatThrownBy(() -> checkout(COMPRADOR, COMPRADOR, bodega(63L, TERCERA)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void compradorSinNegocioNoCambia() {
        assertThatThrownBy(() -> checkout(null, VENDEDOR, bodega(60L, VENDEDOR))).isInstanceOf(PasoValidacion.class);
    }
}

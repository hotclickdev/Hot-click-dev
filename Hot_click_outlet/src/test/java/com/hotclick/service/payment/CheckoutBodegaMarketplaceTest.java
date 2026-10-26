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
        checkout(tenant, bodegaPaquete, empresaProducto);
    }

    /** Un solo paquete con un ítem por empresa (null = producto sin empresa). */
    private static void checkout(Long tenant, Bodega bodegaPaquete, Long... empresasItems) {
        if (tenant != null) TenantContext.set(tenant);
        java.util.Map<Long, Producto> productos = new java.util.HashMap<>();
        java.util.List<PaymentCheckoutRequest.ItemDTO> items = new java.util.ArrayList<>();
        long id = 578L;
        for (Long emp : empresasItems) {
            Producto p = new Producto(); p.setId(id); if (emp != null) p.setEmpresa(empresa(emp));
            productos.put(id, p);
            PaymentCheckoutRequest.ItemDTO item = new PaymentCheckoutRequest.ItemDTO();
            item.setProductoId(id++); item.setCantidad(1);
            items.add(item);
        }
        PaymentCheckoutRequest req = new PaymentCheckoutRequest();
        req.setItems(items); req.setMetodoEnvio(Constants.ENVIO_RETIRO);

        CheckoutPaquetesPlanner planner = mock(CheckoutPaquetesPlanner.class);
        when(planner.planificar(any(), any(), any())).thenReturn(List.of(new CheckoutPaquetesPlanner.Paquete(
            bodegaPaquete, items, 1000, 500, Constants.ENVIO_RETIRO, null)));
        OrderPricingService pricing = mock(OrderPricingService.class);
        doThrow(new PasoValidacion()).when(pricing).exigirCuponValido(any(), any());
        CheckoutGrupoFactory f = new CheckoutGrupoFactory(new CheckoutValidator(), planner, pricing,
            mock(CheckoutOrderFactory.class), mock(GiftCardService.class));
        f.crear(req, new StockReservationResult(1000, 500, productos), null, "ONVO", null, "PENDIENTE");
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

    // ---- NO APTO #321 ----

    @Test
    void carritoAyBEnBodegaDeASeRechaza() {
        assertThatThrownBy(() -> checkout(COMPRADOR, bodega(60L, VENDEDOR), VENDEDOR, TERCERA))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> checkout(null, bodega(60L, VENDEDOR), VENDEDOR, TERCERA))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void invitadoConBodegaDeTerceraTiendaSeRechaza() {
        assertThatThrownBy(() -> checkout(null, VENDEDOR, bodega(61L, TERCERA)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void itemSinEmpresaEnBodegaDeVendedorSeRechaza() {
        assertThatThrownBy(() -> checkout(COMPRADOR, bodega(60L, VENDEDOR), VENDEDOR, null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void paqueteSinBodegaDa400() {
        assertThatThrownBy(() -> checkout(COMPRADOR, (Bodega) null, VENDEDOR))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void bodegaHotClickParaInvitadoNoCambia() {
        assertThatThrownBy(() -> checkout(null, bodega(Constants.BODEGA_DEFAULT_ID, Constants.EMPRESA_PLATAFORMA_ID), VENDEDOR, TERCERA))
            .isInstanceOf(PasoValidacion.class);
    }

    // ---- NO APTO #321 (2) ----

    @Test
    void tenantAEnSuBodegaConCarritoAyBSeRechaza() {
        assertThatThrownBy(() -> checkout(VENDEDOR, bodega(60L, VENDEDOR), VENDEDOR, TERCERA))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void tenantAEnSuBodegaConSoloProductosDeANoCambia() {
        assertThatThrownBy(() -> checkout(VENDEDOR, bodega(60L, VENDEDOR), VENDEDOR, VENDEDOR))
            .isInstanceOf(PasoValidacion.class);
    }
}

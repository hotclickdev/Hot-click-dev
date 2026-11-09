package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Checkout con tarjeta, guest-checkout y SINPE reservan por {@link StockReservationService#reserveForCheckout}.
 * Una tienda en REQUIERE_MEMBRESIA no pasa de ahi: no se guarda reserva.
 */
class RequiereMembresiaCheckoutTest {

    @Test
    @DisplayName("checkout, guest-checkout y SINPE: reserveForCheckout rechaza REQUIERE_MEMBRESIA")
    void reserveForCheckout_rechazaSinMembresia() {
        ProductoRepository repo = mock(ProductoRepository.class);
        Producto producto = new Producto();
        producto.setId(7L);
        producto.setNombreProducto("Sin membresia");
        producto.setEstado(Constants.ESTADO_ACTIVO);
        producto.setVisibleCatalogo(true);
        Empresa empresa = new Empresa();
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setVisibilidadPublica(true);
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        producto.setEmpresa(empresa);
        when(repo.findAllByIdsForUpdate(any())).thenReturn(List.of(producto));

        StockReservationService stock = new StockReservationService();
        ReflectionTestUtils.setField(stock, "productoRepository", repo);
        PaymentCheckoutRequest.ItemDTO item = new PaymentCheckoutRequest.ItemDTO();
        item.setProductoId(7L);
        item.setCantidad(1);

        assertThatThrownBy(() -> stock.reserveForCheckout(List.of(item)))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("no disponible");
        verify(repo, never()).save(any());
    }
}

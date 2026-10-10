package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.stock.AjusteEntradaRequest;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.StockService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** SEC-02: /api/stock solo para la empresa duenia del producto (o ADMIN). */
@DisplayName("[SEC-02] StockController: rol y empresa del producto")
class StockControllerAutorizacionTest {

    private StockService stockService;
    private ProductoRepository productoRepository;
    private CompanyScope companyScope;
    private StockController controller;
    private final UserDetails yo = User.withUsername("duenio@test.cr").password("x").roles("EMPRENDEDOR").build();

    @BeforeEach
    void setUp() {
        stockService = mock(StockService.class);
        productoRepository = mock(ProductoRepository.class);
        companyScope = mock(CompanyScope.class);
        controller = new StockController(stockService, productoRepository, companyScope);
        when(productoRepository.findEmpresaIdByProductoId(10L)).thenReturn(Optional.of(1L));
        when(productoRepository.existsById(10L)).thenReturn(true);
    }

    @Test
    @DisplayName("La clase exige rol ADMIN o EMPRENDEDOR")
    void exigeRol() {
        PreAuthorize pa = StockController.class.getAnnotation(PreAuthorize.class);
        assertThat(pa).isNotNull();
        assertThat(pa.value()).isEqualTo("hasAnyRole('ADMIN','EMPRENDEDOR')");
    }

    @Test
    @DisplayName("Duenio: historial 200 y ajuste 200")
    void duenio_200() {
        when(stockService.historialPorProducto(10L)).thenReturn(List.of());
        assertThat(controller.historial(10L).getStatusCode().value()).isEqualTo(200);
        assertThat(controller.ajustarEntrada(10L, new AjusteEntradaRequest(3, null), yo).getStatusCode().value()).isEqualTo(200);
        verify(stockService).ajustarEntrada(10L, 3, "", "duenio@test.cr");
    }

    @Test
    @DisplayName("Otra empresa: 403 y no toca el stock ni lee el historial")
    void otraEmpresa_403() {
        doThrow(new TenantAccessDeniedException("Acceso denegado")).when(companyScope).assertCanAccessNullable(1L);
        ResponseEntity<ResponseDTO> h = controller.historial(10L);
        ResponseEntity<ResponseDTO> a = controller.ajustarEntrada(10L, new AjusteEntradaRequest(3, null), yo);
        assertThat(h.getStatusCode().value()).isEqualTo(403);
        assertThat(a.getStatusCode().value()).isEqualTo(403);
        verify(stockService, never()).historialPorProducto(anyLong());
        verify(stockService, never()).ajustarEntrada(anyLong(), anyInt(), anyString(), anyString());
    }

    @Test
    @DisplayName("Producto inexistente: 404")
    void inexistente_404() {
        when(productoRepository.findEmpresaIdByProductoId(99L)).thenReturn(Optional.empty());
        when(productoRepository.existsById(99L)).thenReturn(false);
        assertThat(controller.historial(99L).getStatusCode().value()).isEqualTo(404);
        verify(companyScope, never()).assertCanAccessNullable(any());
    }
}

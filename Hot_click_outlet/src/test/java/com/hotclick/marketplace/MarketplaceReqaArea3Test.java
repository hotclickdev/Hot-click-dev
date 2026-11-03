package com.hotclick.marketplace;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.hotclick.controller.producto.ProductoCatalogHandler;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Carrito;
import com.hotclick.model.CarritoItem;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.CarritoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.CarritoService;
import com.hotclick.service.ProductoService;
import com.hotclick.service.StockService;
import com.hotclick.service.producto.ProductoAccessGuard;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Re-QA área 3 | Marketplace")
class MarketplaceReqaArea3Test {

    @AfterEach void limpiar() { TenantContext.clear(); }

    static Producto producto(long id, int estado, boolean visible) {
        Empresa e = new Empresa();
        e.setId(7L);
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        Producto p = new Producto();
        p.setId(id);
        p.setNombreProducto("Cojín");
        p.setEstado(estado);
        p.setVisibleCatalogo(visible);
        p.setEmpresa(e);
        p.setPrecioVenta(5000);
        p.setStockActual(5);
        p.setStockReservado(0);
        return p;
    }

    @Test
    @DisplayName("BAJO | agregar el mismo producto dos veces suma cantidad en una sola línea")
    void carritoFusiona() {
        CarritoService svc = new CarritoService();
        CarritoRepository carritos = mock(CarritoRepository.class);
        ProductoRepository productos = mock(ProductoRepository.class);
        ReflectionTestUtils.setField(svc, "carritoRepository", carritos);
        ReflectionTestUtils.setField(svc, "productoRepository", productos);
        ReflectionTestUtils.setField(svc, "stockService", mock(StockService.class));
        Producto p = producto(3, Constants.ESTADO_ACTIVO, true);
        Carrito c = new Carrito();
        c.setItems(new ArrayList<>());
        TenantContext.set(7L);
        when(carritos.findByIdAndEmpresaId(1L, 7L)).thenReturn(Optional.of(c));
        when(productos.findByIdForUpdate(3L)).thenReturn(Optional.of(p));
        when(carritos.save(any())).thenAnswer(i -> i.getArgument(0));

        svc.agregarItem(1L, 3L, 1);
        svc.agregarItem(1L, 3L, 2);

        assertThat(c.getItems()).hasSize(1);
        CarritoItem unico = c.getItems().get(0);
        assertThat(unico.getCantidad()).isEqualTo(3);
        assertThat(c.getTotalCarrito()).isEqualTo(15000);
    }

    @Test
    @DisplayName("BAJO | /variantes pasa por el guard: producto no publicable → 404")
    void variantesConGuard() {
        ProductoCatalogHandler h = new ProductoCatalogHandler();
        ProductoService ps = mock(ProductoService.class);
        ProductoAccessGuard guard = mock(ProductoAccessGuard.class);
        ReflectionTestUtils.setField(h, "productoService", ps);
        ReflectionTestUtils.setField(h, "productoAccessGuard", guard);
        Producto oculto = producto(4, Constants.ESTADO_ACTIVO, false);
        oculto.setGrupoVarianteId("g1");
        when(ps.buscarPorId(4L)).thenReturn(oculto);
        doThrow(new RecursoNoEncontradoException("Producto no encontrado"))
            .when(guard).assertCanAccessProductoDetalle(oculto);

        ResponseEntity<ResponseDTO> res = h.obtenerVariantes(4L);

        assertThat(res.getStatusCode().value()).isEqualTo(404);
    }

    @Test
    @DisplayName("BAJO | /variantes: un error que no es «no encontrado» no se disfraza de 404")
    void variantesErrorInternoNoEs404() {
        ProductoCatalogHandler h = new ProductoCatalogHandler();
        ProductoService ps = mock(ProductoService.class);
        ReflectionTestUtils.setField(h, "productoService", ps);
        ReflectionTestUtils.setField(h, "productoAccessGuard", mock(ProductoAccessGuard.class));
        when(ps.buscarPorId(6L)).thenThrow(new IllegalStateException("fallo de BD"));

        assertThatThrownBy(() -> h.obtenerVariantes(6L)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("BAJO | /variantes: id inexistente → 404")
    void variantesInexistente404() {
        ProductoCatalogHandler h = new ProductoCatalogHandler();
        ProductoService ps = mock(ProductoService.class);
        ReflectionTestUtils.setField(h, "productoService", ps);
        ReflectionTestUtils.setField(h, "productoAccessGuard", mock(ProductoAccessGuard.class));
        when(ps.buscarPorId(8L)).thenThrow(new RecursoNoEncontradoException("Producto", 8L));

        assertThat(h.obtenerVariantes(8L).getStatusCode().value()).isEqualTo(404);
    }

    @Test
    @DisplayName("BAJO | el JSON público del producto no expone stockReservado")
    void jsonSinStockReservado() throws Exception {
        ObjectMapper om = new ObjectMapper().registerModule(new JavaTimeModule());
        String json = om.writeValueAsString(producto(5, Constants.ESTADO_ACTIVO, true));
        assertThat(json).doesNotContain("stockReservado").contains("\"stock\"");
    }
}

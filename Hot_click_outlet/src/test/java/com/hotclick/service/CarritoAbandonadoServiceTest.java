package com.hotclick.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.CarritoAbandonadoRequestDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.producto.ProductoCatalogQueries;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("CarritoAbandonadoService - stock y tienda del carrito recuperado (Figma 29:2036, 30:1733)")
class CarritoAbandonadoServiceTest {

    private final ProductoRepository productoRepository = mock(ProductoRepository.class);
    private final CarritoAbandonadoService service = new CarritoAbandonadoService();

    @BeforeEach
    void setUp() {
        ProductoCatalogQueries queries = new ProductoCatalogQueries(productoRepository);
        ReflectionTestUtils.setField(queries, "empresaPrincipalId", 1L);
        ReflectionTestUtils.setField(service, "objectMapper", new ObjectMapper());
        ReflectionTestUtils.setField(service, "productoRepository", productoRepository);
        ReflectionTestUtils.setField(service, "productoCatalogQueries", queries);
    }

    private static Producto producto(long id, int estado, int stockActual, int reservado, Empresa empresa) {
        Producto p = new Producto();
        p.setId(id);
        p.setEstado(estado);
        p.setStockActual(stockActual);
        p.setStockReservado(reservado);
        p.setEmpresa(empresa);
        return p;
    }

    private static Empresa empresa(long id, boolean visible) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setNombreEmpresa("Casa Luna S.A.");
        e.setNombreComercial("Casa Luna");
        e.setSlug("casa-luna");
        e.setVisibilidadPublica(visible);
        return e;
    }

    @Test
    @DisplayName("Completa stock disponible y tienda visible; ignora el stock que mande el cliente")
    void completaStockYTienda() {
        when(productoRepository.findAllById(anyList())).thenReturn(List.of(producto(10L, 1, 5, 2, empresa(7L, true))));

        List<CarritoAbandonadoRequestDTO.CartItemDTO> items = service.itemsConDisponibilidad(
            "[{\"productoId\":10,\"cantidad\":1,\"stock\":99,\"empresaNombre\":\"Otra\"}]");

        assertThat(items).hasSize(1);
        assertThat(items.get(0).getStock()).isEqualTo(3);
        assertThat(items.get(0).getEmpresaNombre()).isEqualTo("Casa Luna");
    }

    @Test
    @DisplayName("Sin tienda si el negocio no es visible ni para la tienda principal; sin datos si el producto no est\u00e1 activo")
    void respetaVisibilidadYEstado() {
        when(productoRepository.findAllById(anyList())).thenReturn(List.of(
            producto(10L, 1, 4, 0, empresa(7L, false)),
            producto(11L, 1, 4, 0, empresa(1L, true)),
            producto(12L, 2, 4, 0, empresa(7L, true))));

        List<CarritoAbandonadoRequestDTO.CartItemDTO> items = service.itemsConDisponibilidad(
            "[{\"productoId\":10,\"cantidad\":1},{\"productoId\":11,\"cantidad\":1},{\"productoId\":12,\"cantidad\":1}]");

        assertThat(items).extracting(CarritoAbandonadoRequestDTO.CartItemDTO::getEmpresaNombre).containsOnlyNulls();
        assertThat(items).extracting(CarritoAbandonadoRequestDTO.CartItemDTO::getStock).containsExactly(4, 4, null);
    }

    @Test
    @DisplayName("JSON inv\u00e1lido o sin productos no consulta el cat\u00e1logo")
    void sinProductosNoConsulta() {
        assertThat(service.itemsConDisponibilidad("no-json")).isEmpty();
        verify(productoRepository, never()).findAllById(anyList());
    }
}

package com.hotclick.controller;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.OrigenPedido;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.PedidoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PedidoControllerCrearPedidoTopeOrigenTest {

    private PedidoService pedidoService;
    private CompanyScope companyScope;
    private EmpresaRepository empresaRepository;
    private ProductoRepository productoRepository;
    private PedidoController controller;

    @BeforeEach
    void setUp() {
        pedidoService = mock(PedidoService.class);
        companyScope = mock(CompanyScope.class);
        empresaRepository = mock(EmpresaRepository.class);
        productoRepository = mock(ProductoRepository.class);
        controller = new PedidoController();
        ReflectionTestUtils.setField(controller, "pedidoService", pedidoService);
        ReflectionTestUtils.setField(controller, "companyScope", companyScope);
        ReflectionTestUtils.setField(controller, "empresaRepository", empresaRepository);
        ReflectionTestUtils.setField(controller, "productoRepository", productoRepository);
    }

    private static Pedido pedidoConItems(int n) {
        Pedido p = new Pedido();
        List<PedidoItem> items = new ArrayList<>();
        for (int i = 1; i <= n; i++) {
            PedidoItem it = new PedidoItem();
            Producto prod = new Producto();
            prod.setId((long) i);
            it.setProducto(prod);
            it.setCantidad(1);
            items.add(it);
        }
        p.setItems(items);
        return p;
    }

    private void stubProductos() {
        when(productoRepository.findById(any())).thenAnswer(inv -> {
            Producto prod = new Producto();
            prod.setId(inv.getArgument(0));
            prod.setPrecioVenta(100);
            prod.setPrecioCompra(60);
            return Optional.of(prod);
        });
        when(pedidoService.crearPedido(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void masDelTopeDevuelve400SinTocarBd() {
        ResponseEntity<ResponseDTO> r = controller.crearPedido(pedidoConItems(PaymentCheckoutRequest.MAX_ITEMS + 1));

        assertEquals(400, r.getStatusCode().value());
        assertTrue(r.getBody().getMessage().contains("más de 50 productos distintos"));
        verifyNoInteractions(productoRepository, pedidoService, empresaRepository, companyScope);
    }

    @Test
    void justoEnElTopePasaElChequeo() {
        stubProductos();

        ResponseEntity<ResponseDTO> r = controller.crearPedido(pedidoConItems(PaymentCheckoutRequest.MAX_ITEMS));

        assertEquals(200, r.getStatusCode().value());
        verify(pedidoService).crearPedido(any(Pedido.class));
    }

    @Test
    void origenPosDelClienteSeIgnoraYSeFuerzaManual() {
        stubProductos();
        Pedido body = pedidoConItems(1);
        body.setOrigen(OrigenPedido.POS.codigo());
        body.setId(999L);

        controller.crearPedido(body);

        ArgumentCaptor<Pedido> cap = ArgumentCaptor.forClass(Pedido.class);
        verify(pedidoService).crearPedido(cap.capture());
        assertEquals(OrigenPedido.MANUAL.codigo(), cap.getValue().getOrigen());
        assertNull(cap.getValue().getId());
    }
}

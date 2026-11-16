package com.hotclick.service.pos;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.StockService;
import com.hotclick.service.TurnoCajaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Anular una venta no puede sumar stock a un producto de OTRO negocio (línea heredada de un pedido cruzado). */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("PosAnulacionService: reposición de stock solo a productos del negocio del pedido")
class PosAnulacionStockAjenoTest {

    @Mock CompanyScope companyScope;
    @Mock PropietarioGuard propietarioGuard;
    @Mock MiembroEmpresaRepository miembros;
    @Mock PedidoRepository pedidoRepository;
    @Mock PosVentaTurnoRepository ventaTurnoRepository;
    @Mock PosQrSesionRepository qrSesionRepository;
    @Mock TurnoCajaRepository turnoCajaRepository;
    @Mock TurnoCajaService turnoCajaService;
    @Mock StockService stockService;
    @Mock PosAnulacionRepository anulacionRepository;
    @Mock PagoRepository pagoRepository;

    PosAnulacionService service;
    static final Long EMP_A = 1L;
    static final Long EMP_B = 2L;
    static final Long PEDIDO = 50L;

    private static Producto producto(Long id, Long empresaId) {
        Empresa e = new Empresa();
        e.setId(empresaId);
        Producto p = new Producto();
        p.setId(id);
        p.setEmpresa(e);
        return p;
    }

    private static PedidoItem item(Producto p, int cant) {
        PedidoItem i = new PedidoItem();
        i.setProducto(p);
        i.setCantidad(cant);
        return i;
    }

    @BeforeEach
    void setUp() {
        service = new PosAnulacionService(companyScope, propietarioGuard, miembros, pedidoRepository,
            ventaTurnoRepository, qrSesionRepository, turnoCajaRepository, turnoCajaService, stockService,
            anulacionRepository, pagoRepository);
        Empresa a = new Empresa();
        a.setId(EMP_A);
        Usuario actor = new Usuario();
        actor.setId(7L);
        actor.setCorreo("duenio@test.cr");
        when(companyScope.getCurrentUser()).thenReturn(actor);
        when(propietarioGuard.esPropietario(actor, EMP_A)).thenReturn(true);

        Pedido venta = new Pedido();
        venta.setId(PEDIDO);
        venta.setEmpresa(a);
        venta.setOrigen(OrigenPedido.POS.codigo());
        venta.setEstadoPedido("ENTREGADO");
        venta.setMetodoPago("EFECTIVO");
        venta.setTotalPedido(3000);
        venta.setNumeroPedido("POS-1");
        venta.setItems(List.of(item(producto(10L, EMP_A), 2), item(producto(99L, EMP_B), 5)));
        when(pedidoRepository.findByIdForUpdate(PEDIDO)).thenReturn(Optional.of(venta));

        TurnoCaja turno = new TurnoCaja();
        turno.setId(77L);
        turno.setEmpresa(a);
        turno.setUsuario(actor);
        turno.setEstado("ABIERTO");
        when(ventaTurnoRepository.findByPedidoId(PEDIDO)).thenReturn(Optional.of(new PosVentaTurno(PEDIDO, 77L)));
        when(turnoCajaRepository.findByIdForUpdate(77L)).thenReturn(Optional.of(turno));
        when(anulacionRepository.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    @DisplayName("Anular repone el producto propio (10) y NUNCA el del otro negocio (99)")
    void noSumaStockAProductoAjeno() {
        service.anular(PEDIDO, EMP_A, "error");
        verify(stockService).ajustarEntradaConReferencia(eq(10L), eq(2), any(), any(), any(), any(), any());
        verify(stockService, never()).ajustarEntradaConReferencia(eq(99L), anyInt(), any(), any(), any(), any(), any());
    }
}

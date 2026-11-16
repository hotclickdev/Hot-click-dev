package com.hotclick.service;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.VentaRequestDTO;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CarritoRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MovimientoStockRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.pos.PosVentaService;
import com.hotclick.service.producto.BodegaTenantGuard;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

/** POST /api/ventas y TelegramFlujoService: el tope de líneas vive en el servicio y corre antes de la base. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("VentaService — tope de líneas (MAX_ITEMS)")
class VentaServiceTopeLineasTest {

    @Mock private PedidoService pedidoService;
    @Mock private StockService stockService;
    @Mock private ProductoRepository productoRepository;
    @Mock private BodegaRepository bodegaRepository;
    @Mock private BodegaTenantGuard bodegaTenantGuard;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private CarritoRepository carritoRepository;
    @Mock private MovimientoStockRepository movimientoStockRepository;
    @Mock private EmpresaRepository empresaRepository;

    @InjectMocks private VentaService service;

    private static VentaRequestDTO conLineas(int n) {
        VentaRequestDTO dto = new VentaRequestDTO();
        List<VentaRequestDTO.ItemVentaDTO> items = new ArrayList<>();
        for (int k = 0; k < n; k++) {
            items.add(new VentaRequestDTO.ItemVentaDTO());
        }
        dto.setItems(items);
        return dto;
    }

    @Test
    @DisplayName("MAX_ITEMS + 1 líneas → IllegalArgumentException (400) con el mensaje exacto y sin tocar la base")
    void masDelTope_rechazaSinLeerLaBase() {
        assertThatThrownBy(() -> service.crearVenta(conLineas(PaymentCheckoutRequest.MAX_ITEMS + 1), "caja@test.cr", 1L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(PosVentaService.MENSAJE_MAX_LINEAS_POS)
            .hasMessage("El pedido no puede tener más de " + PaymentCheckoutRequest.MAX_ITEMS + " productos distintos");
        verifyNoInteractions(pedidoService, stockService, productoRepository, bodegaRepository, bodegaTenantGuard,
            usuarioRepository, carritoRepository, movimientoStockRepository, empresaRepository);
    }

    @Test
    @DisplayName("Exactamente MAX_ITEMS líneas: el tope no rechaza (puede fallar después por otra validación)")
    void enElTope_noRechazaPorTope() {
        try {
            service.crearVenta(conLineas(PaymentCheckoutRequest.MAX_ITEMS), "caja@test.cr", 1L);
        } catch (RuntimeException e) {
            org.assertj.core.api.Assertions.assertThat(String.valueOf(e.getMessage()))
                .isNotEqualTo(PosVentaService.MENSAJE_MAX_LINEAS_POS);
        }
    }
}

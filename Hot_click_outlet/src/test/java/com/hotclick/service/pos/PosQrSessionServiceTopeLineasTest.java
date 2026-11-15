package com.hotclick.service.pos;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.TurnoCajaRepository;
import com.hotclick.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

/** POST /api/pos/qr: el tope de líneas corre antes de cualquier lectura de stock o de la base. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("PosQrSessionService.crearSesion — tope de líneas (MAX_ITEMS)")
class PosQrSessionServiceTopeLineasTest {

    @Mock private PosQrSesionRepository posQrRepo;
    @Mock private UsuarioRepository usuarioRepo;
    @Mock private EmpresaRepository empresaRepo;
    @Mock private ProductoRepository productoRepo;
    @Mock private TurnoCajaRepository turnoCajaRepo;
    @Mock private BodegaRepository bodegaRepo;
    @Mock private PosQrStockReserva stockReserva;

    @InjectMocks private PosQrSessionService service;

    private static List<Map<String, Object>> conLineas(int n) {
        List<Map<String, Object>> items = new ArrayList<>();
        for (int k = 0; k < n; k++) {
            Map<String, Object> it = new HashMap<>();
            it.put("productoId", 10L);
            it.put("cantidad", 1);
            items.add(it);
        }
        return items;
    }

    private void sinLecturas() {
        verifyNoInteractions(posQrRepo, usuarioRepo, empresaRepo, productoRepo, turnoCajaRepo, bodegaRepo, stockReserva);
    }

    @Test
    @DisplayName("MAX_ITEMS + 1 (sobrecarga corta) → 400 con mensaje exacto y sin tocar la base")
    void masDelTope_sobrecargaCorta() {
        assertThatThrownBy(() -> service.crearSesion(1L, 1L, 1L, PosQrMetodos.SINPE,
                conLineas(PaymentCheckoutRequest.MAX_ITEMS + 1), null, null, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(PosVentaService.MENSAJE_MAX_LINEAS_POS)
            .hasMessage("El pedido no puede tener más de " + PaymentCheckoutRequest.MAX_ITEMS + " productos distintos");
        sinLecturas();
    }

    @Test
    @DisplayName("MAX_ITEMS + 1 (método principal) → 400 y sin tocar la base")
    void masDelTope_metodoPrincipal() {
        assertThatThrownBy(() -> service.crearSesion(1L, 1L, 1L, PosQrMetodos.TARJETA, null,
                conLineas(PaymentCheckoutRequest.MAX_ITEMS + 1), null, null, null, false))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(PosVentaService.MENSAJE_MAX_LINEAS_POS);
        sinLecturas();
    }

    @Test
    @DisplayName("Exactamente MAX_ITEMS líneas: el tope no rechaza (puede fallar después por otra validación)")
    void enElTope_noRechazaPorTope() {
        try {
            service.crearSesion(1L, 1L, 1L, PosQrMetodos.SINPE, null,
                conLineas(PaymentCheckoutRequest.MAX_ITEMS), null, null, null, false);
        } catch (RuntimeException e) {
            assertThat(String.valueOf(e.getMessage())).isNotEqualTo(PosVentaService.MENSAJE_MAX_LINEAS_POS);
        }
    }
}

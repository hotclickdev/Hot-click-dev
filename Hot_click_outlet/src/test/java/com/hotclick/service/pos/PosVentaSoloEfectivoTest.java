package com.hotclick.service.pos;

import com.hotclick.controller.PosController;
import com.hotclick.dto.PosVentaDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.PosMetodoRequierePasarelaException;
import com.hotclick.model.Pedido;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.StockService;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.service.TurnoCajaService;
import com.hotclick.service.VentaAvisoService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Venta directa del POS: solo EFECTIVO, el resto va por la pasarela")
class PosVentaSoloEfectivoTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private EmpresaRepository empresaRepository;
    @Mock private BodegaRepository bodegaRepository;
    @Mock private ProductoRepository productoRepository;
    @Mock private PedidoRepository pedidoRepository;
    @Mock private StockService stockService;
    @Mock private TurnoCajaService turnoCajaService;
    @Mock private TelegramNotificacionClienteService telegramNotificacionClienteService;
    @Mock private VentaAvisoService ventaAvisoService;
    @Mock private ClienteMostradorResolver clienteMostradorResolver;
    @InjectMocks private PosVentaService service;

    private static PosVentaDTO dto(String metodo) {
        PosVentaDTO dto = new PosVentaDTO();
        dto.setMetodoPago(metodo);
        PosVentaDTO.Item item = new PosVentaDTO.Item();
        item.setProductoId(10L);
        item.setCantidad(1);
        dto.setItems(List.of(item));
        return dto;
    }

    @ParameterizedTest
    @ValueSource(strings = {"SINPE", "TARJETA", "TRANSFERENCIA", "sinpe", "tarjeta", "  Sinpe  ", "SINPE_MOVIL", "texto libre"})
    @DisplayName("servicio: metodo no efectivo se rechaza antes de cualquier efecto")
    void servicioRechazaSinEfectos(String metodo) {
        assertThatThrownBy(() -> service.crearVenta(dto(metodo), 5L, 1L, "caja@test.cr"))
            .isInstanceOf(PosMetodoRequierePasarelaException.class);

        verifyNoInteractions(usuarioRepository, empresaRepository, bodegaRepository, productoRepository,
            pedidoRepository, stockService, turnoCajaService, telegramNotificacionClienteService,
            ventaAvisoService, clienteMostradorResolver);
    }

    @ParameterizedTest
    @ValueSource(strings = {"SINPE", "TARJETA", "TRANSFERENCIA", "sinpe", "  Tarjeta ", "texto libre"})
    @DisplayName("controller: 400 con codigo estable y sin llamar al servicio")
    void controllerDa400ConCodigo(String metodo) {
        PosVentaService servicio = mock(PosVentaService.class);
        PosController c = new PosController();
        ReflectionTestUtils.setField(c, "posVentaService", servicio);
        ReflectionTestUtils.setField(c, "jwtUtil", mock(JwtUtil.class));

        ResponseEntity<?> res = c.crearVenta(dto(metodo), mock(HttpServletRequest.class));

        assertThat(res.getStatusCode().value()).isEqualTo(400);
        ResponseDTO body = (ResponseDTO) res.getBody();
        assertThat(body.isSuccess()).isFalse();
        assertThat(body.getData()).isEqualTo(Map.of("codigo", "POS_METODO_REQUIERE_PASARELA"));
        verifyNoInteractions(servicio);
    }

    @ParameterizedTest
    @ValueSource(strings = {"EFECTIVO", "efectivo", " Efectivo "})
    @DisplayName("controller: EFECTIVO sigue llegando al servicio")
    void efectivoPasaAlServicio(String metodo) {
        PosVentaService servicio = mock(PosVentaService.class);
        JwtUtil jwt = mock(JwtUtil.class);
        when(jwt.extractEmpresaId(any())).thenReturn(1L);
        PosController c = new PosController();
        ReflectionTestUtils.setField(c, "posVentaService", servicio);
        ReflectionTestUtils.setField(c, "jwtUtil", jwt);
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("Authorization")).thenReturn("Bearer x");
        when(servicio.crearVenta(any(), any(), any(), any())).thenReturn(new Pedido());

        assertThat(c.crearVenta(dto(metodo), req).getStatusCode().value()).isEqualTo(200);
    }

    @Test
    @DisplayName("null y vacio siguen significando EFECTIVO")
    void nuloYVacioSiguenSiendoEfectivo() {
        assertThatCode(() -> PosVentaService.exigirMetodoDirecto(null)).doesNotThrowAnyException();
        assertThatCode(() -> PosVentaService.exigirMetodoDirecto("")).doesNotThrowAnyException();
        assertThatCode(() -> PosVentaService.exigirMetodoDirecto("   ")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("candado de reversibilidad: con la restriccion apagada vuelve el comportamiento anterior")
    void restriccionApagadaAceptaTodo() {
        assertThatCode(() -> PosVentaService.exigirMetodoDirecto("SINPE", false)).doesNotThrowAnyException();
        assertThatCode(() -> PosVentaService.exigirMetodoDirecto("TARJETA", false)).doesNotThrowAnyException();
        assertThatThrownBy(() -> PosVentaService.exigirMetodoDirecto("SINPE", true))
            .isInstanceOf(PosMetodoRequierePasarelaException.class);
    }

    @Test
    @DisplayName("la constante de produccion queda en true")
    void constanteEnTrue() throws ReflectiveOperationException {
        Field f = PosVentaService.class.getDeclaredField("METODOS_DIRECTOS_RESTRINGIDOS");
        f.setAccessible(true);
        assertThat(Modifier.isStatic(f.getModifiers())).isTrue();
        assertThat(f.getBoolean(null)).isTrue();
    }
}

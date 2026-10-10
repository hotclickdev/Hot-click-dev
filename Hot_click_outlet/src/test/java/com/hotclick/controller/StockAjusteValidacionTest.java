package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.stock.AjusteEntradaRequest;
import com.hotclick.model.MovimientoStock;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.StockService;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** SEC02-01/02/03: cantidad acotada, correo del operador enmascarado, notas con tope y sin mensajes crudos. */
@DisplayName("[SEC02] StockController: validacion del ajuste y respuestas")
class StockAjusteValidacionTest {

    private StockService stockService;
    private StockController controller;
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
    private final UserDetails yo = User.withUsername("duenio@test.cr").password("x").roles("EMPRENDEDOR").build();

    @BeforeEach
    void setUp() {
        stockService = mock(StockService.class);
        ProductoRepository productoRepository = mock(ProductoRepository.class);
        controller = new StockController(stockService, productoRepository, mock(CompanyScope.class));
        when(productoRepository.findEmpresaIdByProductoId(10L)).thenReturn(Optional.of(1L));
        when(productoRepository.existsById(10L)).thenReturn(true);
    }

    @Test
    @DisplayName("SEC02-01: cantidad negativa, cero, > 100000 o ausente -> 400 sin tocar stock")
    void cantidadFueraDeRango_400() {
        for (Integer c : new Integer[]{-999_999, 0, 100_001, Integer.MAX_VALUE, null}) {
            ResponseEntity<ResponseDTO> r = controller.ajustarEntrada(10L, new AjusteEntradaRequest(c, null), yo);
            assertThat(r.getStatusCode().value()).as("cantidad=%s", c).isEqualTo(400);
            assertThat(validator.validate(new AjusteEntradaRequest(c, null))).as("bean cantidad=%s", c).isNotEmpty();
        }
        verify(stockService, never()).ajustarEntrada(anyLong(), anyInt(), anyString(), anyString());
    }

    @Test
    @DisplayName("SEC02-01: limites 1 y 100000 se aceptan")
    void limites_200() {
        assertThat(controller.ajustarEntrada(10L, new AjusteEntradaRequest(1, "ok"), yo).getStatusCode().value()).isEqualTo(200);
        assertThat(controller.ajustarEntrada(10L, new AjusteEntradaRequest(100_000, null), yo).getStatusCode().value()).isEqualTo(200);
        assertThat(validator.validate(new AjusteEntradaRequest(100_000, "x".repeat(500)))).isEmpty();
    }

    @Test
    @DisplayName("SEC02-03: notas de mas de 500 caracteres -> 400")
    void notasLargas_400() {
        AjusteEntradaRequest req = new AjusteEntradaRequest(5, "x".repeat(501));
        assertThat(validator.validate(req)).isNotEmpty();
        assertThat(controller.ajustarEntrada(10L, req, yo).getStatusCode().value()).isEqualTo(400);
        verify(stockService, never()).ajustarEntrada(anyLong(), anyInt(), anyString(), anyString());
    }

    @Test
    @DisplayName("SEC02-03: el mensaje crudo de la excepcion no llega al cliente")
    void sinMensajeCrudo() {
        doThrow(new IllegalStateException("could not execute statement; SQL [update producto set ...]"))
            .when(stockService).ajustarEntrada(anyLong(), anyInt(), anyString(), anyString());
        ResponseEntity<ResponseDTO> r = controller.ajustarEntrada(10L, new AjusteEntradaRequest(5, null), yo);
        assertThat(r.getStatusCode().value()).isEqualTo(400);
        assertThat(r.getBody().getMessage()).isEqualTo(StockController.ERROR_GENERICO).doesNotContain("SQL");
    }

    @Test
    @DisplayName("SEC02-02: operadorCorreo sale enmascarado en el historial")
    @SuppressWarnings("unchecked")
    void correoEnmascarado() {
        MovimientoStock m = new MovimientoStock();
        m.setOperadorCorreo("juan.perez@hotclick.cr");
        when(stockService.historialPorProducto(10L)).thenReturn(List.of(m));
        ResponseEntity<ResponseDTO> r = controller.historial(10L);
        List<Map<String, Object>> filas = (List<Map<String, Object>>) r.getBody().getData();
        assertThat(filas.get(0).get("operadorCorreo")).isEqualTo("j***@hotclick.cr");
        assertThat(StockController.enmascararCorreo("sinarroba")).isEqualTo("***");
        assertThat(StockController.enmascararCorreo(null)).isNull();
    }
}

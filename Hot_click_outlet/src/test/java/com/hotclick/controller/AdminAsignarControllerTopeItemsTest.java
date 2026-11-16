package com.hotclick.controller;

import com.hotclick.dto.ManualPedidoDTO;
import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Pedido;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.PedidoService;
import jakarta.validation.Validation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** /api/admin/asignar/compra arma el ManualPedidoDTO en código: el tope de ítems debe validarse a mano. */
@DisplayName("AdminAsignarController.asignarCompra: tope de ítems")
class AdminAsignarControllerTopeItemsTest {

    private MockMvc mvc;
    private PedidoService pedidoService;
    private EmpresaRepository empresaRepository;

    @BeforeEach
    void setUp() {
        AdminAsignarController c = new AdminAsignarController();
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(null); // ADMIN de plataforma
        pedidoService = mock(PedidoService.class);
        when(pedidoService.crearPedidoManual(any(), any())).thenReturn(new Pedido());
        empresaRepository = mock(EmpresaRepository.class);
        ReflectionTestUtils.setField(c, "companyScope", scope);
        ReflectionTestUtils.setField(c, "pedidoService", pedidoService);
        ReflectionTestUtils.setField(c, "usuarioRepository", mock(UsuarioRepository.class));
        ReflectionTestUtils.setField(c, "empresaRepository", empresaRepository);
        ReflectionTestUtils.setField(c, "validator", Validation.buildDefaultValidatorFactory().getValidator());
        mvc = MockMvcBuilders.standaloneSetup(c).build();
    }

    private static String json(int n) {
        StringBuilder items = new StringBuilder();
        for (int i = 1; i <= n; i++) {
            if (i > 1) items.append(',');
            items.append("{\"productoId\":").append(i).append(",\"cantidad\":1,\"precioUnitario\":100}");
        }
        return "{\"usuarioId\":5,\"items\":[" + items + "]}";
    }

    @Test
    @DisplayName("51 ítems → 400 con el mensaje del tope; no se lee BD ni se invoca el servicio")
    void masDelTope_400_sinServicio() throws Exception {
        mvc.perform(post("/api/admin/asignar/compra").contentType(MediaType.APPLICATION_JSON)
                .content(json(PaymentCheckoutRequest.MAX_ITEMS + 1)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("más de 50 productos")));
        verify(pedidoService, never()).crearPedidoManual(any(), any());
        verifyNoInteractions(empresaRepository);
    }

    @Test
    @DisplayName("50 ítems → no es 400 por tope: llega al servicio")
    void enElTope_pasa() throws Exception {
        mvc.perform(post("/api/admin/asignar/compra").contentType(MediaType.APPLICATION_JSON)
                .content(json(PaymentCheckoutRequest.MAX_ITEMS)))
            .andExpect(status().isOk());
        verify(pedidoService).crearPedidoManual(any(ManualPedidoDTO.class), any());
    }
}

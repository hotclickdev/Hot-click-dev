package com.hotclick.controller;

import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.PedidoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Un bodegaId/usuarioId mal formado es error del cliente: 400, nunca 500, y no crea pedido. */
class AdminAsignarControllerIdInvalidoTest {

    private MockMvc mvc;
    private PedidoService pedidoService;

    @BeforeEach
    void setUp() {
        AdminAsignarController c = new AdminAsignarController();
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(null);
        pedidoService = mock(PedidoService.class);
        ReflectionTestUtils.setField(c, "companyScope", scope);
        ReflectionTestUtils.setField(c, "pedidoService", pedidoService);
        ReflectionTestUtils.setField(c, "usuarioRepository", mock(UsuarioRepository.class));
        ReflectionTestUtils.setField(c, "empresaRepository", mock(EmpresaRepository.class));
        mvc = MockMvcBuilders.standaloneSetup(c).build();
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "{\"usuarioId\":5,\"bodegaId\":\"abc\",\"items\":[{\"productoId\":1,\"cantidad\":1,\"precioUnitario\":100}]}",
        "{\"usuarioId\":5,\"bodegaId\":\"-3\",\"items\":[{\"productoId\":1,\"cantidad\":1,\"precioUnitario\":100}]}",
        "{\"usuarioId\":\"x9\",\"items\":[{\"productoId\":1,\"cantidad\":1,\"precioUnitario\":100}]}"
    })
    void idMalFormadoDa400(String json) throws Exception {
        mvc.perform(post("/api/admin/asignar/compra").contentType(MediaType.APPLICATION_JSON).content(json))
            .andExpect(status().isBadRequest());
        verify(pedidoService, never()).crearPedidoManual(any(), any());
    }

    @org.junit.jupiter.api.Test
    void idOpcionalAceptaVacioYPositivos() {
        assertThat(AdminAsignarController.idOpcional(null, "bodegaId")).isNull();
        assertThat(AdminAsignarController.idOpcional(" ", "bodegaId")).isNull();
        assertThat(AdminAsignarController.idOpcional("12", "bodegaId")).isEqualTo(12L);
        assertThat(AdminAsignarController.idOpcional(12, "bodegaId")).isEqualTo(12L);
    }
}

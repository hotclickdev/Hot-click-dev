package com.hotclick.controller;

import com.hotclick.model.PosAnulacion;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.pos.PosAnulacionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** A3: mapeo HTTP de anular/devolver (403 permisos, 400 motivo, 404 venta). */
class PosAnulacionControllerTest {

    PosAnulacionService service = mock(PosAnulacionService.class);
    JwtUtil jwtUtil = mock(JwtUtil.class);
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        when(jwtUtil.extractEmpresaId("tok")).thenReturn(1L);
        mvc = MockMvcBuilders.standaloneSetup(new PosAnulacionController(service, jwtUtil)).build();
    }

    @Test
    @DisplayName("anular OK → 200 con motivo y usuario en la respuesta")
    void anularOk() throws Exception {
        PosAnulacion a = new PosAnulacion();
        a.setTipo("ANULACION");
        a.setMotivo("error");
        a.setUsuarioId(7L);
        when(service.anular(50L, 1L, "error")).thenReturn(a);
        mvc.perform(post("/api/pos/ventas/50/anular").header("Authorization", "Bearer tok")
                .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"error\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.motivo").value("error"))
            .andExpect(jsonPath("$.data.usuarioId").value(7));
    }

    @Test
    @DisplayName("devolver sin permiso → 403")
    void devolverSinPermiso403() throws Exception {
        when(service.devolver(anyLong(), anyLong(), any())).thenThrow(new SecurityException("Solo el dueño"));
        mvc.perform(post("/api/pos/ventas/50/devolver").header("Authorization", "Bearer tok")
                .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"x\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("sin motivo → 400")
    void sinMotivo400() throws Exception {
        when(service.anular(eq(50L), eq(1L), isNull())).thenThrow(new IllegalArgumentException("El motivo es obligatorio."));
        mvc.perform(post("/api/pos/ventas/50/anular").header("Authorization", "Bearer tok")
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("sin token → 403 (fail-closed)")
    void sinToken403() throws Exception {
        mvc.perform(post("/api/pos/ventas/50/anular").contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"x\"}"))
            .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("venta inexistente → 404")
    void noEncontrada404() throws Exception {
        when(service.anular(anyLong(), anyLong(), any()))
            .thenThrow(new com.hotclick.exception.RecursoNoEncontradoException("Venta", 50L));
        mvc.perform(post("/api/pos/ventas/50/anular").header("Authorization", "Bearer tok")
                .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"x\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Mensajes internos no llegan al cliente: 403/400/409 usan textos de lista blanca")
    void mensajesInternosNoSeFiltran() throws Exception {
        when(service.anular(eq(51L), anyLong(), any())).thenThrow(new SecurityException("SQL fk_id_empresa=99 detalle"));
        mvc.perform(post("/api/pos/ventas/51/anular").header("Authorization", "Bearer tok")
                .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"x\"}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value(PosAnulacionController.MSG_403));
        when(service.anular(eq(52L), anyLong(), any())).thenThrow(new IllegalArgumentException("Producto 10 inactivo"));
        mvc.perform(post("/api/pos/ventas/52/anular").header("Authorization", "Bearer tok")
                .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"x\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(PosAnulacionController.MSG_400));
        when(service.anular(eq(53L), anyLong(), any())).thenThrow(new IllegalStateException(PosAnulacionService.MSG_YA_ANULADA));
        mvc.perform(post("/api/pos/ventas/53/anular").header("Authorization", "Bearer tok")
                .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"x\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message").value(PosAnulacionService.MSG_YA_ANULADA));
    }
}

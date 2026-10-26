package com.hotclick.controller;

import com.hotclick.model.Cotizacion;
import com.hotclick.model.CotizacionItem;
import com.hotclick.service.CotizacionService;
import com.hotclick.service.cotizacion.CotizacionTotalsCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Retiro de /api/cotizaciones/clientes (404) + validación de montos (400) + pública sigue OK. */
class CotizacionControllerHttpTest {

    CotizacionService service = mock(CotizacionService.class);
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        CotizacionController c = new CotizacionController();
        ReflectionTestUtils.setField(c, "cotizacionService", service);
        mvc = MockMvcBuilders.standaloneSetup(c).build();
    }

    private static String body(String precio, String cantidad, String desc) {
        return "{\"clienteId\":1,\"items\":[{\"tipo\":\"TEMPORAL\",\"nombre\":\"X\",\"cantidad\":" + cantidad
            + ",\"precioUnitario\":" + precio + ",\"descuentoPorcentaje\":" + desc + "}]}";
    }

    @Test
    @DisplayName("controller de clientes de cotización ya no existe en el classpath")
    void controllerBorrado() {
        assertThrows(ClassNotFoundException.class,
            () -> Class.forName("com.hotclick.controller.CotizacionClienteController"));
        assertThrows(ClassNotFoundException.class,
            () -> Class.forName("com.hotclick.dto.CotizacionClienteRequestDTO"));
    }

    @Test
    @DisplayName("GET/POST/PUT/DELETE /api/cotizaciones/clientes → 404")
    void rutasClientes404() throws Exception {
        mvc.perform(get("/api/cotizaciones/clientes")).andExpect(status().isNotFound());
        mvc.perform(post("/api/cotizaciones/clientes").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isNotFound());
        mvc.perform(put("/api/cotizaciones/clientes/5").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isNotFound());
        mvc.perform(delete("/api/cotizaciones/clientes/5")).andExpect(status().isNotFound());
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("GET /api/cotizaciones/publica/{token} sigue respondiendo 200")
    void publicaOk() throws Exception {
        UUID t = UUID.randomUUID();
        when(service.buscarPorToken(t)).thenReturn(new Cotizacion());
        mvc.perform(get("/api/cotizaciones/publica/" + t)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST con montos válidos → 200")
    void postValido() throws Exception {
        when(service.crear(any(), any())).thenReturn(new Cotizacion());
        mvc.perform(post("/api/cotizaciones").contentType(MediaType.APPLICATION_JSON).content(body("1000", "2", "10")))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST/PUT con precio negativo, cantidad 0, descuento >100 u overflow → 400")
    void montosInvalidos400() throws Exception {
        String[] malos = {
            body("-1", "1", "0"), body("100", "0", "0"), body("100", "1", "101"), body("100", "1", "-5"),
            body("2000000000", "1", "0"), body("100", "2000000", "0"), body("99999999999", "1", "0")
        };
        for (String b : malos) {
            mvc.perform(post("/api/cotizaciones").contentType(MediaType.APPLICATION_JSON).content(b))
                .andExpect(status().isBadRequest());
            mvc.perform(put("/api/cotizaciones/7").contentType(MediaType.APPLICATION_JSON).content(b))
                .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("PUT sin nombre de ítem → 400 (@NotBlank real)")
    void putSinNombre400() throws Exception {
        mvc.perform(put("/api/cotizaciones/7").contentType(MediaType.APPLICATION_JSON)
                .content("{\"clienteId\":1,\"items\":[{\"cantidad\":1,\"precioUnitario\":1}]}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("subtotal/total en el tope no desbordan: rechaza con IllegalArgumentException")
    void overflowAritmetico() {
        assertEquals(1800, com.hotclick.service.cotizacion.CotizacionItemMapperAccess.subtotal(1000, 2, 10));
        assertThrows(IllegalArgumentException.class,
            () -> com.hotclick.service.cotizacion.CotizacionItemMapperAccess.subtotal(1_000_000_000, 1_000_000, 0));
        Cotizacion c = new Cotizacion();
        for (int i = 0; i < 3; i++) {
            CotizacionItem it = new CotizacionItem();
            it.setSubtotalLinea(1_000_000_000);
            c.getItems().add(it);
        }
        assertThrows(IllegalArgumentException.class, () -> new CotizacionTotalsCalculator().calcularTotales(c));
    }
}

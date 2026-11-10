package com.hotclick.controller;

import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.repository.PlanRepository;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.TenantService;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.service.prueba.PruebaPlanService;
import com.hotclick.service.suscripcion.CobroSuscripcionService;
import com.hotclick.service.suscripcion.LecturaPlanesException;
import com.hotclick.service.suscripcion.PlanesActivosLector;
import com.hotclick.service.suscripcion.PreciosPlanesConfig;
import com.hotclick.service.suscripcion.SnapshotLecturaPg;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * BAJO Seguridad: si el snapshot no queda en REPEATABLE READ (o el SHOW falla) o la paginación interna está mal
 * armada, /api/planes y /api/billing/planes responden 500 genérico, nunca 400 con el texto interno.
 */
@DisplayName("Error de lectura de planes (snapshot/SHOW/paginación) → 500 genérico en ambos endpoints, sin texto interno")
class PlanesErrorLecturaMvcTest {

    private MockMvc mvc(PlanesActivosLector lector) {
        PreciosPlanesConfig cfg = new PreciosPlanesConfig("9", "24", "49", "usd");
        TenantController tenant = new TenantController(mock(TenantService.class), lector, mock(PruebaPlanService.class), cfg);
        SuscripcionController billing = new SuscripcionController(mock(SuscripcionService.class), mock(PlanRepository.class),
            mock(AuthSupport.class), mock(CobroSuscripcionService.class), cfg, mock(PropietarioGuard.class));
        ReflectionTestUtils.setField(billing, "planesActivos", lector);
        return MockMvcBuilders.standaloneSetup(tenant, billing).setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/planes", "/api/billing/planes"})
    @DisplayName("El snapshot no confirma REPEATABLE READ → 500 «Error interno del servidor»")
    void snapshotNoConfirmado(String ruta) throws Exception {
        SnapshotLecturaPg snapshot = mock(SnapshotLecturaPg.class);
        doThrow(new LecturaPlanesException("La lectura de planes no quedó en REPEATABLE READ"))
            .when(snapshot).exigirRepeatableRead();
        mvc(new PlanesActivosLector(mock(PlanRepository.class), snapshot)).perform(get(ruta))
            .andExpect(status().isInternalServerError())
            .andExpect(content().string(containsString("Error interno del servidor")))
            .andExpect(content().string(not(containsString("REPEATABLE"))));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/planes", "/api/billing/planes"})
    @DisplayName("Paginación interna mal armada → 500 genérico, no 400 con el mensaje")
    void paginacionMalArmada(String ruta) throws Exception {
        PlanesActivosLector lector = mock(PlanesActivosLector.class);
        when(lector.activos(any())).thenThrow(new LecturaPlanesException("Se requiere la página 0 acotada con orden precioMensual, id"));
        mvc(lector).perform(get(ruta))
            .andExpect(status().isInternalServerError())
            .andExpect(content().string(not(containsString("precioMensual"))));
    }
}

package com.hotclick.controller;

import com.hotclick.exception.PlanSinPrecioException;
import com.hotclick.model.Plan;
import com.hotclick.repository.PlanRepository;
import com.hotclick.service.suscripcion.PreciosPlanesConfig;
import com.hotclick.service.suscripcion.SuscripcionTilopayService;
import com.hotclick.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Precio mensual USD por configuración: 9/24/49 o 409 PLAN_SIN_PRECIO")
class PlanSinPrecioTest {

    private final PlanRepository planRepo = mock(PlanRepository.class);
    private final SuscripcionTilopayService tilopay = mock(SuscripcionTilopayService.class);

    @AfterEach void limpiar() { TenantContext.clear(); }

    private static Plan plan(long id, String nombre) {
        Plan p = new Plan();
        p.setId(id);
        p.setNombre(nombre);
        p.setPrecioUsd(new BigDecimal("11.99")); // valor viejo en BD: nunca se debe publicar
        return p;
    }

    private final com.hotclick.service.SuscripcionService suscripcion = mock(com.hotclick.service.SuscripcionService.class);
    private final com.hotclick.service.auth.AuthSupport auth = mock(com.hotclick.service.auth.AuthSupport.class);
    private final com.hotclick.security.PropietarioGuard guard = mock(com.hotclick.security.PropietarioGuard.class);

    private SuscripcionController controller(PreciosPlanesConfig precios) {
        when(guard.puedeGestionarEmpresa(any())).thenReturn(true);
        return new SuscripcionController(suscripcion, planRepo, auth, tilopay, precios, guard);
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "QA3-012: EDITOR recibe 403 en {0}")
    @org.junit.jupiter.params.provider.ValueSource(strings = {
        "/api/billing/checkout/3", "/api/billing/trial", "/api/billing/cancelar", "/api/billing/portal"})
    void editorBilling403(String ruta) throws Exception {
        TenantContext.set(7L);
        var c = controller(new PreciosPlanesConfig("9", "24", "49"));
        when(guard.puedeGestionarEmpresa(any())).thenReturn(false);
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(c).build();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(ruta))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
        verifyNoInteractions(tilopay, planRepo, suscripcion);
    }

    @Test @DisplayName("QA3-012: un EDITOR recibe 403 en cambiar-plan antes de precio, límite o cobro")
    void editorCambiarPlan403() throws Exception {
        TenantContext.set(7L);
        var c = controller(new PreciosPlanesConfig("9", "24", "49"));
        when(guard.puedeGestionarEmpresa(any())).thenReturn(false);
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(c).build();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/billing/cambiar-plan/3"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
        verifyNoInteractions(tilopay, planRepo);
    }

    @Test @DisplayName("Con precios configurados, /planes publica 9/24/49 y no el valor de BD")
    @SuppressWarnings("unchecked")
    void configurado() {
        when(planRepo.findByActivoTrueOrderByPrecioMensualAsc())
            .thenReturn(List.of(plan(1, "EMPRENDEDOR"), plan(2, "PYME"), plan(3, "NEGOCIO_PLUS")));
        var r = controller(new PreciosPlanesConfig("9", "24", "49")).listarPlanes();
        assertThat(r.getStatusCode().value()).isEqualTo(200);
        var lista = (List<Map<String, Object>>) r.getBody();
        assertThat(lista).extracting(m -> m.get("precioUsd"))
            .containsExactly(new BigDecimal("9"), new BigDecimal("24"), new BigDecimal("49"));
    }

    @Test @DisplayName("Si falta el precio de un plan, /planes responde 409 PLAN_SIN_PRECIO")
    @SuppressWarnings("unchecked")
    void faltaPrecioEnLista() {
        when(planRepo.findByActivoTrueOrderByPrecioMensualAsc())
            .thenReturn(List.of(plan(1, "EMPRENDEDOR"), plan(2, "PYME")));
        var r = controller(new PreciosPlanesConfig("9", "", "49")).listarPlanes();
        assertThat(r.getStatusCode().value()).isEqualTo(409);
        var body = (Map<String, Object>) r.getBody();
        assertThat(body).containsEntry("codigo", "PLAN_SIN_PRECIO").containsEntry("plan", "PYME");
    }

    @Test @DisplayName("Checkout de un plan sin precio: 409 PLAN_SIN_PRECIO y no se inicia cobro")
    void faltaPrecioEnCheckout() {
        TenantContext.set(7L);
        when(planRepo.findById(3L)).thenReturn(Optional.of(plan(3, "NEGOCIO_PLUS")));
        var r = controller(new PreciosPlanesConfig("9", "24", null)).crearCheckout(3L, null);
        assertThat(r.getStatusCode().value()).isEqualTo(409);
        assertThat(r.getBody()).containsEntry("codigo", "PLAN_SIN_PRECIO");
        verify(tilopay, never()).iniciarCambioPlan(any(), any());
        verify(suscripcion, never()).cambiarPlanOnvo(any(), any());
    }

    @Test @DisplayName("Precio configurado en 0, negativo o mal escrito cuenta como sin precio (409)")
    void ceroNegativoInvalido() {
        var precios = new PreciosPlanesConfig("0", "-24", "abc");
        for (String plan : List.of("EMPRENDEDOR", "PYME", "NEGOCIO_PLUS")) {
            assertThat(precios.precioUsd(plan)).isEmpty();
            assertThatThrownBy(() -> precios.requerir(plan)).isInstanceOf(PlanSinPrecioException.class);
        }
        when(planRepo.findByActivoTrueOrderByPrecioMensualAsc()).thenReturn(List.of(plan(1, "EMPRENDEDOR")));
        assertThat(controller(precios).listarPlanes().getStatusCode().value()).isEqualTo(409);
    }

    @Test @DisplayName("Cambiar a un plan con precio USD 0: 409 y nunca se activa sin cobro")
    void cambiarPlanPrecioCero_noActiva() throws Exception {
        TenantContext.set(7L);
        when(planRepo.findById(2L)).thenReturn(Optional.of(plan(2, "PYME")));
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders
            .standaloneSetup(controller(new PreciosPlanesConfig("9", "0", "49"))).build();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/billing/cambiar-plan/2"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isConflict())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.codigo").value("PLAN_SIN_PRECIO"));
        verifyNoInteractions(tilopay);
    }

    @Test @DisplayName("Manipulación del cliente: precio/plan/monto enviados se ignoran; manda el servidor")
    void manipulacionClienteIgnorada() throws Exception {
        TenantContext.set(7L);
        Plan plus = plan(3, "NEGOCIO_PLUS");
        plus.setPrecioMensual(28_900);
        when(planRepo.findById(3L)).thenReturn(Optional.of(plus));
        com.hotclick.model.Usuario u = new com.hotclick.model.Usuario();
        u.setCorreoVerificado(true);
        when(auth.usuarioFromRequest(any())).thenReturn(u);
        when(suscripcion.cambiarPlanOnvo(7L, 3L)).thenReturn(new java.util.LinkedHashMap<>(Map.of(
            "status", "requiere_pago", "subscriptionId", "sub_1", "planNombre", "NEGOCIO_PLUS")));
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders
            .standaloneSetup(controller(new PreciosPlanesConfig("9", "24", "49"))).build();
        String trampa = "{\"precio\":0,\"precioUsd\":0,\"montoCrc\":1,\"plan\":\"EMPRENDEDOR\",\"planId\":1,\"estado\":\"ACTIVO\"}";
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/billing/checkout/3")
                .param("precio", "0").param("monto", "1").param("plan", "EMPRENDEDOR")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON).content(trampa))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.status").value("requiere_pago"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.proveedor").value("ONVO"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.planNombre").value("NEGOCIO_PLUS"));
        // El servicio solo recibe empresa (del token) y planId (de la ruta); nada del cuerpo ni de la query.
        verify(suscripcion).cambiarPlanOnvo(7L, 3L);
        verifyNoInteractions(tilopay);
    }

    @Test @DisplayName("QA8: negocio pendiente de aprobación → 409 EMPRESA_PENDIENTE_APROBACION con mensaje claro")
    void empresaPendienteAprobacion409() throws Exception {
        TenantContext.set(7L);
        Plan pyme = plan(2, "PYME");
        pyme.setPrecioMensual(28_900);
        when(planRepo.findById(2L)).thenReturn(Optional.of(pyme));
        com.hotclick.model.Usuario u = new com.hotclick.model.Usuario();
        u.setCorreoVerificado(true);
        when(auth.usuarioFromRequest(any())).thenReturn(u);
        when(suscripcion.cambiarPlanOnvo(7L, 2L)).thenThrow(new com.hotclick.exception.EmpresaPendienteAprobacionException());
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders
            .standaloneSetup(controller(new PreciosPlanesConfig("9", "24", "49"))).build();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/billing/cambiar-plan/2"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isConflict())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.codigo").value("EMPRESA_PENDIENTE_APROBACION"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.error").value(
                "Tu negocio está en revisión; podrás elegir plan cuando lo aprobemos."));
    }

    @Test @DisplayName("Los 400 no exponen el mensaje interno de la excepción")
    void error400Generico() {
        TenantContext.set(7L);
        when(planRepo.findById(4L)).thenReturn(Optional.of(plan(4, "PYME")));
        when(suscripcion.cambiarPlanOnvo(7L, 4L)).thenThrow(new IllegalArgumentException("SQL interno: tabla x columna y"));
        var r = controller(new PreciosPlanesConfig("9", "24", "49")).crearCheckout(4L, null);
        assertThat(r.getStatusCode().value()).isEqualTo(400);
        assertThat(r.getBody().get("error").toString()).doesNotContain("SQL").startsWith("No pudimos procesar");
    }

    @Test @DisplayName("requerir() nunca inventa 0: sin propiedad lanza PlanSinPrecioException")
    void requerirSinValor() {
        var precios = new PreciosPlanesConfig(" ", null, "49");
        assertThat(precios.precioUsd("NEGOCIO_PLUS")).contains(new BigDecimal("49"));
        assertThatThrownBy(() -> precios.requerir("EMPRENDEDOR")).isInstanceOf(PlanSinPrecioException.class);
        assertThatThrownBy(() -> precios.requerir("PYME")).isInstanceOf(PlanSinPrecioException.class);
    }
}

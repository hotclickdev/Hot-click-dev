package com.hotclick.controller;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.security.TenantContext;
import com.hotclick.service.TenantService;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.service.prueba.PruebaPlanService;
import com.hotclick.service.suscripcion.AdminSuspensionService;
import com.hotclick.service.suscripcion.OnvoBillingVerificador;
import com.hotclick.service.suscripcion.PrecioPlanOnvo;
import com.hotclick.service.suscripcion.PreciosPlanesConfig;
import com.hotclick.service.suscripcion.SuscripcionOnvoChangeService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * ALTO precio publicado: GET /api/planes publicaba precio_usd de la tabla plan (V89/V105: 19.99 / 11.99) mientras ONVO
 * cobra 9 / 24 / 49. Ahora el precio publicado sale de la MISMA config que {@link PrecioPlanOnvo} verifica contra el price
 * de ONVO; sin config, no se publica monto (fail-closed).
 */
@DisplayName("ALTO precios: /api/planes publica lo que cobra ONVO, desde una sola fuente")
class PlanesPrecioFuenteUnicaTest {

    private final PlanRepository planRepo = mock(PlanRepository.class);

    @AfterEach void limpiar() { TenantContext.clear(); }

    /** Plan con los precios VIEJOS de BD: ninguno debe aparecer en la respuesta. */
    private static Plan plan(long id, String nombre, String usdViejoBd, int crcViejoBd) {
        Plan p = new Plan();
        p.setId(id);
        p.setNombre(nombre);
        p.setPrecioUsd(new BigDecimal(usdViejoBd));
        p.setPrecioMensual(crcViejoBd);
        p.setTienePos(true);
        p.setMaxProductos(-1);
        return p;
    }

    private static List<Plan> catalogoBd() {
        return List.of(
            plan(1, "EMPRENDEDOR", "0.00", 0),
            plan(2, "PYME", "11.99", 12900),
            plan(3, "NEGOCIO_PLUS", "19.99", 28900));
    }

    private void planesDeBd() {
        when(planRepo.findByActivoTrue(any())).thenAnswer(inv -> paginar(catalogoBd(), inv.getArgument(0)));
    }

    /** Simula la paginación de Spring Data sobre una lista ya ordenada. */
    private static org.springframework.data.domain.Slice<Plan> paginar(List<Plan> todos, org.springframework.data.domain.Pageable p) {
        int desde = (int) Math.min(p.getOffset(), todos.size());
        int hasta = Math.min(desde + p.getPageSize(), todos.size());
        return new org.springframework.data.domain.SliceImpl<>(todos.subList(desde, hasta), p, hasta < todos.size());
    }

    private MockMvc mvc(PreciosPlanesConfig precios) {
        return MockMvcBuilders.standaloneSetup(new TenantController(
            mock(TenantService.class), planRepo, mock(PruebaPlanService.class), precios)).build();
    }

    private static Map<String, Object> priceOnvo(String id, long unitAmount) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", id); m.put("mode", "test"); m.put("currency", "USD"); m.put("unitAmount", unitAmount); m.put("isActive", true);
        return m;
    }

    @Test
    @DisplayName("GET /api/planes devuelve 9/24/49 de la config, nunca 19.99/11.99 de V89/V105")
    void publicaPreciosDeConfig() throws Exception {
        planesDeBd();
        mvc(new PreciosPlanesConfig("9", "24", "49", "usd")).perform(get("/api/planes"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(3))
            .andExpect(jsonPath("$[0].nombre").value("EMPRENDEDOR"))
            .andExpect(jsonPath("$[0].precioUsd").value(9))
            .andExpect(jsonPath("$[1].precioUsd").value(24))
            .andExpect(jsonPath("$[2].precioUsd").value(49))
            // Límites y features siguen saliendo de la tabla plan (no se rompe el frontend).
            .andExpect(jsonPath("$[2].tienePos").value(true))
            .andExpect(jsonPath("$[2].maxProductos").value(-1));
    }

    @Test
    @DisplayName("El precio publicado es exactamente el monto que se verifica contra ONVO (misma fuente)")
    @SuppressWarnings("unchecked")
    void coincideConMontoOnvo() {
        planesDeBd();
        PreciosPlanesConfig config = new PreciosPlanesConfig("9", "24", "49", "usd");
        OnvoBillingClient onvo = mock(OnvoBillingClient.class);
        when(onvo.modoEsperado()).thenReturn("test");
        doReturn(priceOnvo("price_emp", 900)).when(onvo).obtenerPrecio("price_emp");
        doReturn(priceOnvo("price_pyme", 2400)).when(onvo).obtenerPrecio("price_pyme");
        doReturn(priceOnvo("price_plus", 4900)).when(onvo).obtenerPrecio("price_plus");
        PrecioPlanOnvo precioOnvo = new PrecioPlanOnvo(config, onvo);
        Map<String, String> priceIds = Map.of("EMPRENDEDOR", "price_emp", "PYME", "price_pyme", "NEGOCIO_PLUS", "price_plus");

        var body = (List<Map<String, Object>>) new TenantController(
            mock(TenantService.class), planRepo, mock(PruebaPlanService.class), config).planesPublicos().getBody();
        assertThat(body).hasSize(3);
        for (Map<String, Object> p : body) {
            String nombre = (String) p.get("nombre");
            OnvoBillingVerificador.PrecioEsperado cobro = precioOnvo.esperado(nombre, priceIds.get(nombre));
            assertThat(cobro).as("ONVO confirma el precio de %s", nombre).isNotNull();
            assertThat(cobro.moneda()).isEqualTo("usd");
            assertThat(((BigDecimal) p.get("precioUsd")).movePointRight(2).longValueExact())
                .as("precio publicado de %s = monto cobrado por ONVO", nombre).isEqualTo(cobro.unidadMenor());
        }
    }

    @ParameterizedTest(name = "config de PYME «{0}» → precioUsd null (ni inventado ni el viejo 11.99)")
    @ValueSource(strings = {"", " ", "0", "-24", "abc"})
    void configFaltanteFailClosed(String pyme) throws Exception {
        planesDeBd();
        mvc(new PreciosPlanesConfig("9", pyme, "49", "usd")).perform(get("/api/planes"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[1].nombre").value("PYME"))
            .andExpect(jsonPath("$[1].precioUsd").value(nullValue()))
            .andExpect(jsonPath("$[0].precioUsd").value(9))
            .andExpect(jsonPath("$[2].precioUsd").value(49));
    }

    @Test
    @DisplayName("Sin ninguna config de precios: ningún plan publica monto")
    void sinConfigNingunPrecio() throws Exception {
        planesDeBd();
        mvc(new PreciosPlanesConfig(null, null, null, null)).perform(get("/api/planes"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].precioUsd").value(nullValue()))
            .andExpect(jsonPath("$[1].precioUsd").value(nullValue()))
            .andExpect(jsonPath("$[2].precioUsd").value(nullValue()));
    }

    @Test
    @DisplayName("Moneda de cobro configurada distinta de USD: no se publica un monto en dólares")
    void monedaNoUsdNoPublica() throws Exception {
        planesDeBd();
        mvc(new PreciosPlanesConfig("9", "24", "49", "crc")).perform(get("/api/planes"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[1].precioUsd").value(nullValue()))
            .andExpect(jsonPath("$[2].precioUsd").value(nullValue()));
    }

    @Test
    @DisplayName("precioPublicoUsd: solo con moneda USD explícita; nula, vacía, otra moneda, 0 o vacío no publican")
    void precioPublicoUsdReglas() {
        assertThat(new PreciosPlanesConfig("9", "24", "49", "USD").precioPublicoUsd("PYME")).contains(new BigDecimal("24"));
        assertThat(new PreciosPlanesConfig("9", "24", "49", "usd").precioPublicoUsd("negocio_plus")).contains(new BigDecimal("49"));
        // Fail-closed de moneda: sin USD explícito (nula o vacía) no se publica precio.
        assertThat(new PreciosPlanesConfig("9", "24", "49", null).precioPublicoUsd("NEGOCIO_PLUS")).isEmpty();
        assertThat(new PreciosPlanesConfig("9", "24", "49", "").precioPublicoUsd("PYME")).isEmpty();
        assertThat(new PreciosPlanesConfig("9", "24", "49", " ").precioPublicoUsd("PYME")).isEmpty();
        assertThat(new PreciosPlanesConfig("9", "24", "49").precioPublicoUsd("PYME")).isEmpty();
        assertThat(new PreciosPlanesConfig("9", "24", "49", "eur").precioPublicoUsd("PYME")).isEmpty();
        assertThat(new PreciosPlanesConfig("9", "0", "49", "usd").precioPublicoUsd("PYME")).isEmpty();
        assertThat(new PreciosPlanesConfig("9", "24", "49", "usd").precioPublicoUsd("OTRO")).isEmpty();
        assertThat(new PreciosPlanesConfig("9", "24", "49", "usd").precioPublicoUsd(null)).isEmpty();
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "GET /api/planes sin moneda USD explícita («{0}»): todos los precioUsd null")
    @org.junit.jupiter.params.provider.NullAndEmptySource
    @ValueSource(strings = {" "})
    void sinMonedaNoPublica(String moneda) throws Exception {
        planesDeBd();
        mvc(new PreciosPlanesConfig("9", "24", "49", moneda)).perform(get("/api/planes"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(3))
            .andExpect(jsonPath("$[0].precioUsd").value(nullValue()))
            .andExpect(jsonPath("$[1].precioUsd").value(nullValue()))
            .andExpect(jsonPath("$[2].precioUsd").value(nullValue()));
    }

    @Test
    @DisplayName("SCALE1: lista TODOS los activos en páginas acotadas (más de una página y nombres no canónicos, sin truncar)")
    void todosLosActivosPaginados() throws Exception {
        // 3 del catálogo + 120 activos con nombres no canónicos: más de 2 páginas de TAMANO_PAGINA_PLANES (50).
        List<Plan> todos = new java.util.ArrayList<>(catalogoBd());
        for (int i = 0; i < 120; i++) todos.add(plan(100 + i, "Legado Feria " + i, "5.00", 50_000 + i));
        when(planRepo.findByActivoTrue(any())).thenAnswer(inv -> paginar(todos, inv.getArgument(0)));
        mvc(new PreciosPlanesConfig("9", "24", "49", "usd")).perform(get("/api/planes"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(123))
            .andExpect(jsonPath("$[0].nombre").value("EMPRENDEDOR"))
            .andExpect(jsonPath("$[1].precioUsd").value(24))
            .andExpect(jsonPath("$[2].precioUsd").value(49))
            // No canónico: se publica (no se esconde) pero sin precio inventado ni el de BD (fail-closed null).
            .andExpect(jsonPath("$[3].nombre").value("Legado Feria 0"))
            .andExpect(jsonPath("$[3].precioUsd").value(nullValue()))
            .andExpect(jsonPath("$[122].nombre").value("Legado Feria 119"))
            .andExpect(jsonPath("$[122].precioUsd").value(nullValue()));
        var paginas = org.mockito.ArgumentCaptor.forClass(org.springframework.data.domain.Pageable.class);
        verify(planRepo, org.mockito.Mockito.times(3)).findByActivoTrue(paginas.capture());
        assertThat(paginas.getAllValues()).extracting(org.springframework.data.domain.Pageable::getPageNumber).containsExactly(0, 1, 2);
        assertThat(paginas.getAllValues()).allSatisfy(pg -> {
            assertThat(pg.getPageSize()).isEqualTo(com.hotclick.service.suscripcion.PlanPublicoMapper.TAMANO_PAGINA);
            assertThat(pg.getSort()).isEqualTo(com.hotclick.service.suscripcion.PlanPublicoMapper.ORDEN);
        });
    }

    @Test
    @DisplayName("SCALE1: más páginas que el tope → error, nunca una lista parcial")
    void topeDePaginasNoTrunca() {
        when(planRepo.findByActivoTrue(any())).thenAnswer(inv -> {
            org.springframework.data.domain.Pageable p = inv.getArgument(0);
            return new org.springframework.data.domain.SliceImpl<>(List.of(plan(p.getPageNumber(), "P" + p.getPageNumber(), "1", 0)), p, true);
        });
        var c = new TenantController(mock(TenantService.class), planRepo, mock(PruebaPlanService.class),
            new PreciosPlanesConfig("9", "24", "49", "usd"));
        org.assertj.core.api.Assertions.assertThatThrownBy(c::planesPublicos).isInstanceOf(IllegalStateException.class);
        verify(planRepo, org.mockito.Mockito.times(com.hotclick.service.suscripcion.PlanPublicoMapper.MAX_PAGINAS)).findByActivoTrue(any());
    }

    @Test
    @DisplayName("/api/planes y /api/billing/planes comparten los campos base del plan (mismo mapper)")
    @SuppressWarnings("unchecked")
    void mismosCamposBase() {
        planesDeBd();
        PreciosPlanesConfig cfg = new PreciosPlanesConfig("9", "24", "49", "usd");
        var publico = new TenantController(mock(TenantService.class), planRepo, mock(PruebaPlanService.class), cfg)
            .planesPublicos().getBody();
        var billing = (List<Map<String, Object>>) new SuscripcionController(
            mock(com.hotclick.service.SuscripcionService.class), planRepo, mock(AuthSupport.class),
            mock(com.hotclick.service.suscripcion.CobroSuscripcionService.class), cfg, mock(PropietarioGuard.class))
            .listarPlanes().getBody();
        for (int i = 0; i < 3; i++) {
            Map<String, Object> base = com.hotclick.service.suscripcion.PlanPublicoMapper.base(catalogoBd().get(i));
            assertThat(publico.get(i)).containsAllEntriesOf(base).containsEntry("precioUsd", billing.get(i).get("precioUsd"));
            assertThat(billing.get(i)).containsAllEntriesOf(base);
        }
    }

    @Test
    @DisplayName("Nombres con otra capitalización («pyme») se listan: sin filtro IN exacto; el precio normaliza mayúsculas")
    void capitalizacionNoCanonica() throws Exception {
        List<Plan> todos = List.of(plan(1, "EMPRENDEDOR", "0", 0), plan(7, "pyme", "11.99", 12900),
            plan(2, "PYME", "11.99", 12900), plan(3, "Negocio_Plus", "19.99", 28900));
        when(planRepo.findByActivoTrue(any())).thenAnswer(inv -> paginar(todos, inv.getArgument(0)));
        mvc(new PreciosPlanesConfig("9", "24", "49", "usd")).perform(get("/api/planes"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(4))
            .andExpect(jsonPath("$[1].nombre").value("pyme"))
            .andExpect(jsonPath("$[1].precioUsd").value(24))
            .andExpect(jsonPath("$[2].nombre").value("PYME"))
            .andExpect(jsonPath("$[2].precioUsd").value(24))
            .andExpect(jsonPath("$[3].nombre").value("Negocio_Plus"))
            .andExpect(jsonPath("$[3].precioUsd").value(49));
    }

    @Test
    @DisplayName("/api/billing/planes lee el MISMO conjunto paginado (más de una página); un activo sin precio sigue dando 409 global")
    @SuppressWarnings("unchecked")
    void billingMismoConjuntoPaginado() {
        List<Plan> todos = new java.util.ArrayList<>(catalogoBd());
        for (int i = 0; i < 60; i++) todos.add(plan(200 + i, i % 2 == 0 ? "pyme" : "Negocio_Plus", "1", 30_000 + i));
        when(planRepo.findByActivoTrue(any())).thenAnswer(inv -> paginar(todos, inv.getArgument(0)));
        java.util.function.Function<List<Plan>, SuscripcionController> ctrl = x -> new SuscripcionController(
            mock(com.hotclick.service.SuscripcionService.class), planRepo, mock(AuthSupport.class),
            mock(com.hotclick.service.suscripcion.CobroSuscripcionService.class),
            new PreciosPlanesConfig("9", "24", "49", "usd"), mock(PropietarioGuard.class));
        var ok = ctrl.apply(todos).listarPlanes();
        assertThat(ok.getStatusCode().value()).isEqualTo(200);
        assertThat((List<Map<String, Object>>) ok.getBody()).hasSize(63)
            .extracting(m -> m.get("id")).containsExactlyElementsOf(todos.stream().map(p -> (Object) p.getId()).toList());
        todos.add(plan(999, "Legado Feria", "1", 99_999));
        var r = ctrl.apply(todos).listarPlanes();
        assertThat(r.getStatusCode().value()).isEqualTo(409);
        assertThat((Map<String, Object>) r.getBody()).containsEntry("codigo", "PLAN_SIN_PRECIO").containsEntry("plan", "Legado Feria");
    }

    // ---- Tienda suspendida: el monto pendiente es el de ONVO (USD), no los colones viejos de la tabla plan ----

    private Map<String, Object> estadoSuspendida(PreciosPlanesConfig precios) {
        TenantContext.set(10L);
        Empresa e = new Empresa();
        e.setId(10L);
        e.setEstadoEmpresa(com.hotclick.utils.Constants.ESTADO_EMPRESA_SUSPENDIDO_IMPAGO);
        EmpresaRepository empresaRepo = mock(EmpresaRepository.class);
        when(empresaRepo.findById(10L)).thenReturn(Optional.of(e));
        SuscripcionOnvoChangeService onvoChange = mock(SuscripcionOnvoChangeService.class);
        when(onvoChange.planPendienteDeSuspension(10L)).thenReturn(Optional.of(plan(2, "PYME", "11.99", 12900)));
        var c = new CuentaSuspendidaController(empresaRepo, onvoChange, mock(PropietarioGuard.class),
            mock(AuthSupport.class), mock(AdminSuspensionService.class), precios);
        return c.estado().getBody();
    }

    @Test
    @DisplayName("Suspendida: montoPendiente = 24 USD de la config (no ₡12.900 ni 11.99 de BD)")
    void suspendidaMontoOnvo() {
        Map<String, Object> out = estadoSuspendida(new PreciosPlanesConfig("9", "24", "49", "usd"));
        assertThat(out).containsEntry("suspendida", true)
            .containsEntry("planPendiente", "PYME")
            .containsEntry("montoPendiente", new BigDecimal("24"))
            .containsEntry("moneda", "USD");
    }

    @Test
    @DisplayName("Suspendida sin precio configurado: no se muestra monto (la UI deshabilita Pagar)")
    void suspendidaSinConfig() {
        Map<String, Object> out = estadoSuspendida(new PreciosPlanesConfig("9", "", "49", "usd"));
        assertThat(out).containsEntry("planPendiente", "PYME")
            .doesNotContainKey("montoPendiente")
            .doesNotContainKey("moneda");
    }

    @Test
    @DisplayName("/api/billing/planes usa la misma regla: moneda no USD → 409 PLAN_SIN_PRECIO; USD → 9/24/49")
    @SuppressWarnings("unchecked")
    void billingPlanesMismaRegla() {
        planesDeBd();
        java.util.function.Function<PreciosPlanesConfig, SuscripcionController> ctrl = precios -> new SuscripcionController(
            mock(com.hotclick.service.SuscripcionService.class), planRepo, mock(AuthSupport.class),
            mock(com.hotclick.service.suscripcion.CobroSuscripcionService.class), precios, mock(PropietarioGuard.class));
        assertThat(ctrl.apply(new PreciosPlanesConfig("9", "24", "49", "crc")).listarPlanes().getStatusCode().value())
            .isEqualTo(409);
        var ok = ctrl.apply(new PreciosPlanesConfig("9", "24", "49", "usd")).listarPlanes();
        assertThat((List<Map<String, Object>>) ok.getBody()).extracting(m -> m.get("precioUsd"))
            .containsExactly(new BigDecimal("9"), new BigDecimal("24"), new BigDecimal("49"));
    }
}

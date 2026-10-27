package com.hotclick.security;

import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Seguridad (#390): la capa por IP de RateLimitingFilter se evadía con una URI codificada
 * (/api/gift-cards/%76alidar). Con un limitador que cuenta de verdad, cada variante de la ruta tiene que
 * agotar el MISMO cupo que la ruta plana y recibir 429. Cubre varios GetLimit, un POST exacto y un PrefixLimit.
 */
class RateLimitRutaCanonicaTest {

    private static final String IP = "1.2.3.4";

    /** Limitador de ventana fija en memoria: true mientras el contador de la clave no pase el máximo. */
    private static RateLimiter limitadorQueCuenta() {
        Map<String, Integer> cuentas = new ConcurrentHashMap<>();
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenAnswer(inv ->
            cuentas.merge(inv.getArgument(0, String.class), 1, Integer::sum) <= inv.getArgument(1, Integer.class));
        return rl;
    }

    private static RateLimitingFilter filtro(RateLimiter rl) {
        RateLimitingFilter f = new RateLimitingFilter();
        ClientIpResolver ip = mock(ClientIpResolver.class);
        when(ip.resolve(any())).thenReturn(IP);
        ReflectionTestUtils.setField(f, "rateLimiter", rl);
        ReflectionTestUtils.setField(f, "clientIpResolver", ip);
        ReflectionTestUtils.setField(f, "auditService", mock(com.hotclick.service.SecurityAuditService.class));
        return f;
    }

    private static int llamar(RateLimitingFilter f, String metodo, String uri, String contexto) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest(metodo, uri);
        req.setRequestURI(uri);
        req.setContextPath(contexto);
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        f.doFilter(req, res, chain);
        return res.getStatus();
    }

    private static int llamar(RateLimitingFilter f, String metodo, String uri) throws Exception {
        return llamar(f, metodo, uri, "");
    }

    /** Un caso por ruta limitada: método, ruta plana, tope esperado y variantes que el MVC resolvería igual. */
    private record Caso(String metodo, String plana, int max, List<String> variantes) {}

    private static List<Caso> casos() {
        return List.of(
            // GetLimit 1: segunda capa de gift cards (el caso reportado)
            new Caso("GET", "/api/gift-cards/validar", 30, List.of(
                "/api/gift-cards/%76alidar", "/api/gift-cards/%76alidar;a=b",
                "/api/gift-cards/valida%72", "/api/gift-cards/valida%72/",
                "/%61pi/gift-cards/validar", "/api/gift-cards/%76%61%6c%69%64%61%72", "/api/gift-cards/%76%61%6C%69%64%61%72",
                "/api/gift-cards/%2576alidar", "/api/gift-cards/%252576alidar",
                "/api/gift-cards/validar;jsessionid=ABC", "/api/gift-cards/validar;x", "/api/gift-cards;x=1/validar",
                "/api/gift-cards/validar/", "/api/gift-cards/validar//", "//api//gift-cards//validar",
                "/api/./gift-cards/./validar", "/api/x/../gift-cards/validar", "/api/%2e/gift-cards/validar", "/api/x/%2E%2e/gift-cards/validar")),
            // GetLimit 2: proxy a Hacienda (prefijo con comodín)
            new Caso("GET", "/api/hacienda/contribuyente/123456789", 10, List.of(
                "/api/hacienda/%63ontribuyente/123456789", "/%61pi/hacienda/contribuyente/123456789",
                "/api/hacienda/contribuyente/123456789/", "/api/hacienda/contribuyente;x/123456789",
                "/api/hacienda//contribuyente/123456789", "/api/hacienda/./contribuyente/123456789",
                "/api/hacienda/%2563ontribuyente/123456789")),
            // GetLimit 3: catálogo público
            new Caso("GET", "/api/categorias", 60, List.of(
                "/api/%63ategorias", "/api/categorias;jsessionid=Z", "/api/categorias/", "/api//categorias",
                "/api/x/../categorias", "/api/%2563ategorias")),
            // POST de ruta exacta
            new Caso("POST", "/api/auth/login", 10, List.of(
                "/api/auth/%6cogin", "/api/auth/%6Cogin", "/api/auth/login;x", "/api/auth/login/", "/api//auth/login",
                "/api/auth/./login", "/api/auth/%256cogin")),
            // POST con PrefixLimit porRecurso (bucket por ruta completa)
            new Caso("POST", "/api/pedidos/77/notificar", 5, List.of(
                "/api/pedidos/77/%6eotificar", "/api/pedidos/77/notificar/", "/api/pedidos/77;x/notificar",
                "/api/pedidos/%37%37/notificar", "/api/pedidos//77/notificar"))
        );
    }

    @TestFactory
    Stream<DynamicTest> variantesAgotanElMismoCupoQueLaRutaPlana() {
        return casos().stream().flatMap(c -> c.variantes().stream().map(v ->
            DynamicTest.dynamicTest(c.metodo() + " " + v, () -> {
                RateLimitingFilter f = filtro(limitadorQueCuenta());
                // Mismo cupo: la mitad con la ruta plana y el resto con la variante llega al tope...
                for (int i = 0; i < c.max(); i++) {
                    String uri = (i % 2 == 0) ? c.plana() : v;
                    assertThat(llamar(f, c.metodo(), uri)).as("#%d %s", i + 1, uri).isNotEqualTo(429);
                }
                // ...y a partir de ahí ambas dan 429, igual que la plana.
                assertThat(llamar(f, c.metodo(), c.plana())).as("plana tras agotar").isEqualTo(429);
                assertThat(llamar(f, c.metodo(), v)).as("variante tras agotar: " + v).isEqualTo(429);
            })));
    }

    @TestFactory
    Stream<DynamicTest> soloConLaVarianteTambienSeLlegaAlTope() {
        return casos().stream().flatMap(c -> c.variantes().stream().limit(4).map(v ->
            DynamicTest.dynamicTest("solo " + c.metodo() + " " + v, () -> {
                RateLimitingFilter f = filtro(limitadorQueCuenta());
                for (int i = 0; i < c.max(); i++) {
                    assertThat(llamar(f, c.metodo(), v)).isNotEqualTo(429);
                }
                assertThat(llamar(f, c.metodo(), v)).isEqualTo(429);
                assertThat(llamar(f, c.metodo(), c.plana())).isEqualTo(429);
            })));
    }

    @Test
    void contextPath_noDejaEvadirNiCambiaElCupo() throws Exception {
        RateLimitingFilter f = filtro(limitadorQueCuenta());
        String[] formas = {
            "/hotclick/api/gift-cards/validar", "/hotclick/api/gift-cards/%76alidar",
            "/%68otclick/api/gift-cards/validar", "/hotclick;jsessionid=A/api/gift-cards/validar"
        };
        for (int i = 0; i < 30; i++) {
            assertThat(llamar(f, "GET", formas[i % formas.length], "/hotclick")).isNotEqualTo(429);
        }
        for (String uri : formas) {
            assertThat(llamar(f, "GET", uri, "/hotclick")).as(uri).isEqualTo(429);
        }
    }

    @Test
    void rutaPlana_siguePasandoHastaElTope_yOtraIpNoComparteCupo() throws Exception {
        // Regresión del comportamiento previo: la ruta plana ya contaba y 30 pasan, la 31 no.
        RateLimitingFilter f = filtro(limitadorQueCuenta());
        for (int i = 0; i < 30; i++) assertThat(llamar(f, "GET", "/api/gift-cards/validar")).isEqualTo(200);
        assertThat(llamar(f, "GET", "/api/gift-cards/validar")).isEqualTo(429);
        // Una ruta sin límite no se ve afectada por la canonización.
        assertThat(llamar(f, "GET", "/api/health")).isEqualTo(200);
        assertThat(llamar(f, "GET", "/api/%68ealth")).isEqualTo(200);
    }

    @Test
    void rutasInvalidas_fallanCerradoConBadRequest_sinPasarAlControlador() throws Exception {
        RateLimitingFilter f = filtro(limitadorQueCuenta());
        Map<String, Integer> resultados = new LinkedHashMap<>();
        for (String uri : new String[]{"/api/gift-cards/%zz", "/api/gift-cards/%", "/api/gift-cards/%00validar",
                "/api/gift-cards/%0d%0avalidar", "/api/gift-cards/%FFvalidar", "/api/gift-cards/%25252576alidar"}) {
            MockHttpServletRequest req = new MockHttpServletRequest("GET", uri);
            req.setRequestURI(uri);
            MockHttpServletResponse res = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();
            f.doFilter(req, res, chain);
            resultados.put(uri, res.getStatus());
            assertThat(chain.getRequest()).as("no debe llegar a la cadena: " + uri).isNull();
        }
        assertThat(resultados.values()).containsOnly(400);
    }
}

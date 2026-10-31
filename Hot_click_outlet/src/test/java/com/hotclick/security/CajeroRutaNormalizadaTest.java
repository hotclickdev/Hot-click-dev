package com.hotclick.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** LOW Seguridad: las guardas de CAJERO deciden sobre la ruta normalizada (%2e, ;jsessionid, //). */
class CajeroRutaNormalizadaTest {

    private CajeroSoloPosInterceptor soloPos;
    private CajeroSinCatalogoInterceptor sinCatalogo;

    @BeforeEach
    void setUp() {
        PropietarioGuard guard = mock(PropietarioGuard.class);
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(7L);
        when(guard.esCajero(any())).thenReturn(true);
        soloPos = new CajeroSoloPosInterceptor(guard, scope, new ObjectMapper());
        sinCatalogo = new CajeroSinCatalogoInterceptor(guard, scope, new ObjectMapper());
    }

    private static MockHttpServletRequest req(String metodo, String uri) {
        MockHttpServletRequest r = new MockHttpServletRequest(metodo, uri);
        r.setContextPath("");
        return r;
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "/api/pos/%2e%2e/pedidos            | /api/pedidos",
        "/api/pos/%2E%2E/pedidos            | /api/pedidos",
        "/api/pos/../pedidos                | /api/pedidos",
        "/api/pos/./venta                   | /api/pos/venta",
        "/api/pos;jsessionid=ABC/historial  | /api/pos/historial",
        "/api/productos;x=1                 | /api/productos",
        "/api//productos                    | /api/productos",
        "//api///bodegas                    | /api/bodegas",
        "/api/%70roductos                   | /api/productos",
    })
    void normaliza(String uri, String esperada) {
        assertThat(RutaCajero.normalizar(req("GET", uri))).isEqualTo(esperada);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/pos/%2e%2e/pedidos", "/api/pos/../crm/clientes", "/api/pos;x/../gastos",
        "/api//pedidos", "/api/cuenta/%2e%2e/cupones"})
    void soloPosNoSeEsquivaConTraversal(String uri) throws Exception {
        MockHttpServletResponse res = new MockHttpServletResponse();
        assertThat(soloPos.preHandle(req("GET", uri), res, new Object())).as(uri).isFalse();
        assertThat(res.getStatus()).isEqualTo(403);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/pos/historial", "/api/pos;jsessionid=1/caja/activo", "/api//pos/venta",
        "/api/productos/pos/categorias", "/api/crm/clientes/buscar"})
    void soloPosPermiteRutasDelPos(String uri) throws Exception {
        assertThat(soloPos.preHandle(req("GET", uri), new MockHttpServletResponse(), new Object())).as(uri).isTrue();
    }

    @Test
    void soloPosNoPermiteEscribirLecturas() throws Exception {
        assertThat(soloPos.preHandle(req("POST", "/api/crm/clientes/buscar"), new MockHttpServletResponse(),
            new Object())).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/productos", "/api//productos", "/api/productos;jsessionid=X",
        "/api/%70roductos/5", "/api/pos/%2e%2e/bodegas", "/api/x/../stock/ajuste-entrada/1"})
    void sinCatalogoBloqueaEscrituraNormalizada(String uri) throws Exception {
        MockHttpServletResponse res = new MockHttpServletResponse();
        assertThat(sinCatalogo.preHandle(req("POST", uri), res, new Object())).as(uri).isFalse();
        assertThat(res.getStatus()).isEqualTo(403);
    }

    @Test
    void sinCatalogoDejaPasarFueraDelCatalogoYLecturas() throws Exception {
        assertThat(sinCatalogo.preHandle(req("POST", "/api/pos/venta"), new MockHttpServletResponse(),
            new Object())).isTrue();
        assertThat(sinCatalogo.preHandle(req("GET", "/api/productos"), new MockHttpServletResponse(),
            new Object())).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/crm/clientes", "/api/soporte/tickets", "/api/soporte/tickets/fotos", "/api//crm/clientes;jsessionid=1"})
    void soloPosPermitePostDeClienteYTicket(String uri) throws Exception {
        assertThat(soloPos.preHandle(req("POST", uri), new MockHttpServletResponse(), new Object())).as(uri).isTrue();
    }

    @ParameterizedTest
    @CsvSource({"PUT,/api/crm/clientes/5", "PATCH,/api/crm/clientes/5", "DELETE,/api/crm/clientes/5",
        "POST,/api/crm/clientes/5/puntos", "POST,/api/soporte/tickets/fotos/x", "PUT,/api/soporte/tickets/fotos", "POST,/api/soporte/tickets/fotos/../../pedidos", "GET,/api/soporte/tickets",
        "POST,/api/soporte/tickets/%2e%2e/../pedidos", "PUT,/api/soporte/tickets"})
    void soloPosNiegaElRestoDeClientesYTickets(String metodo, String uri) throws Exception {
        assertThat(soloPos.preHandle(req(metodo, uri), new MockHttpServletResponse(), new Object())).as(uri).isFalse();
    }
}

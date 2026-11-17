package com.hotclick.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Allowlist y deny-by-default de {@link CajeroSoloPosInterceptor} (el cajero de equipo solo opera el POS).
 * La normalización de ruta (%2e, ;jsessionid, //) la cubre CajeroRutaNormalizadaTest.
 */
class CajeroSoloPosInterceptorTest {

    private static CajeroSoloPosInterceptor interceptor(boolean esCajero) {
        PropietarioGuard guard = mock(PropietarioGuard.class);
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(7L);
        when(guard.esCajero(any())).thenReturn(esCajero);
        return new CajeroSoloPosInterceptor(guard, scope, new ObjectMapper());
    }

    private static MockHttpServletRequest req(String metodo, String uri) {
        MockHttpServletRequest r = new MockHttpServletRequest(metodo, uri);
        r.setContextPath("");
        return r;
    }

    @ParameterizedTest
    @CsvSource({
        "GET,/api/pedidos", "POST,/api/pedidos", "GET,/api/cupones", "DELETE,/api/clientes/5",
        "POST,/api/productos", "GET,/api/soporte/tickets"
    })
    void noCajeroPasaEnCualquierRuta(String metodo, String uri) throws Exception {
        MockHttpServletResponse res = new MockHttpServletResponse();
        assertThat(interceptor(false).preHandle(req(metodo, uri), res, new Object())).as(metodo + " " + uri).isTrue();
        assertThat(res.getStatus()).isEqualTo(200);
    }

    @ParameterizedTest
    @CsvSource({"/api/pedidos", "/api/pos/venta", "/api/gastos"})
    void optionsPasaAunqueSeaCajeroYNoEsteEnAllowlist(String uri) throws Exception {
        MockHttpServletResponse res = new MockHttpServletResponse();
        assertThat(interceptor(true).preHandle(req("OPTIONS", uri), res, new Object())).isTrue();
        assertThat(res.getStatus()).isEqualTo(200);
    }

    @ParameterizedTest
    @CsvSource({
        "GET,/api/pos", "GET,/api/pos/historial", "POST,/api/pos/venta", "PUT,/api/pos/caja/1", "DELETE,/api/pos/venta/3",
        "GET,/api/cuenta", "PUT,/api/cuenta/perfil", "POST,/api/consentimiento", "GET,/api/consentimiento/estado",
        "GET,/api/productos", "GET,/api/productos/5", "HEAD,/api/productos",
        "GET,/api/categorias", "GET,/api/categorias/3", "GET,/api/bodegas", "GET,/api/bodegas/2",
        "GET,/api/crm/clientes/buscar",
        "POST,/api/crm/clientes", "POST,/api/soporte/tickets", "POST,/api/soporte/tickets/fotos"
    })
    void cajeroPuedeOperarElPos(String metodo, String uri) throws Exception {
        MockHttpServletResponse res = new MockHttpServletResponse();
        assertThat(interceptor(true).preHandle(req(metodo, uri), res, new Object())).as(metodo + " " + uri).isTrue();
        assertThat(res.getStatus()).as(metodo + " " + uri).isEqualTo(200);
    }

    @ParameterizedTest
    @CsvSource({
        "GET,/api/pedidos", "POST,/api/pedidos", "GET,/api/pedidos/9", "PUT,/api/pedidos/9/estado",
        "GET,/api/cupones", "POST,/api/cupones", "GET,/api/gastos", "POST,/api/gastos",
        "GET,/api/clientes", "GET,/api/crm/clientes", "GET,/api/crm/clientes/5",
        "POST,/api/productos", "PUT,/api/productos/5", "PATCH,/api/productos/5", "DELETE,/api/productos/5",
        "POST,/api/categorias", "DELETE,/api/bodegas/2",
        "POST,/api/crm/clientes/buscar", "PUT,/api/crm/clientes", "PUT,/api/crm/clientes/5",
        "PATCH,/api/crm/clientes/5", "DELETE,/api/crm/clientes/5", "POST,/api/crm/clientes/5",
        "GET,/api/soporte/tickets", "PUT,/api/soporte/tickets", "DELETE,/api/soporte/tickets",
        "GET,/api/soporte/tickets/fotos", "POST,/api/soporte/tickets/7",
        "GET,/api/finanzas", "GET,/api/admin/dashboard"
    })
    void cajeroNoPuedeFueraDelPos(String metodo, String uri) throws Exception {
        MockHttpServletResponse res = new MockHttpServletResponse();
        assertThat(interceptor(true).preHandle(req(metodo, uri), res, new Object())).as(metodo + " " + uri).isFalse();
        assertThat(res.getStatus()).as(metodo + " " + uri).isEqualTo(403);
    }

    @Test
    void el403EsJsonConElMensajeDelRol() throws Exception {
        MockHttpServletResponse res = new MockHttpServletResponse();
        assertThat(interceptor(true).preHandle(req("GET", "/api/pedidos"), res, new Object())).isFalse();
        assertThat(res.getStatus()).isEqualTo(403);
        assertThat(res.getContentType()).startsWith("application/json");
        assertThat(res.getContentAsString()).contains(CajeroSoloPosInterceptor.MSG);
    }
}

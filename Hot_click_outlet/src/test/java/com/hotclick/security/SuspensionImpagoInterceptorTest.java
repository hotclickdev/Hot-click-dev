package com.hotclick.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.suscripcion.SuspensionImpago;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DisplayName("26-oct: tienda SUSPENDIDO_IMPAGO solo ve cuenta, monto pendiente y pagar")
class SuspensionImpagoInterceptorTest {

    private final CompanyScope scope = mock(CompanyScope.class);
    private final EmpresaRepository repo = mock(EmpresaRepository.class);
    private final SuspensionImpagoInterceptor it = new SuspensionImpagoInterceptor(scope, repo, new ObjectMapper());

    private boolean pasa(String metodo, String ruta, MockHttpServletResponse res) throws Exception {
        return it.preHandle(new MockHttpServletRequest(metodo, ruta), res, new Object());
    }

    private void suspendida() {
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(7L);
        when(repo.findEstadoEmpresaById(7L)).thenReturn(Optional.of("SUSPENDIDO_IMPAGO"));
    }

    @ParameterizedTest(name = "(b) {0} {1} → 403")
    @CsvSource({
        "GET,/api/pedidos", "POST,/api/pedidos/manual", "GET,/api/ventas/resumen",
        "GET,/api/productos", "POST,/api/productos", "PUT,/api/productos/5", "DELETE,/api/productos/5",
        "GET,/api/pos/cajas", "POST,/api/pos/ventas",
        "GET,/api/reportes/ventas", "GET,/api/dashboard",
        "GET,/api/tenant/info", "GET,/api/billing/suscripcion", "GET,/api/billing/planes",
        "POST,/api/billing/cambiar-plan/1", "POST,/api/billing/checkout/2", "POST,/api/billing/cancelar",
        "POST,/api/billing/trial", "GET,/api/auth/mis-negocios", "POST,/api/auth/cambiar-negocio",
        "POST,/api/billing/impago/pagar/extra", "GET,/api/sinpe/admin/comprobantes"
    })
    void bloqueaTodoLoQueNoEsCuentaOPago(String metodo, String ruta) throws Exception {
        suspendida();
        MockHttpServletResponse res = new MockHttpServletResponse();
        assertFalse(pasa(metodo, ruta, res));
        assertEquals(403, res.getStatus());
        assertTrue(res.getContentAsString().contains("SUSCRIPCION_IMPAGA"));
    }

    @ParameterizedTest(name = "(c) allowlist {0} {1} pasa")
    @CsvSource({
        "GET,/api/billing/impago", "GET,/api/billing/impago/", "POST,/api/billing/impago/pagar",
        "POST,/api/auth/login", "POST,/api/auth/refresh", "POST,/api/auth/logout", "POST,/api/auth/2fa/verify",
        "OPTIONS,/api/productos"
    })
    void allowlistPasa(String metodo, String ruta) throws Exception {
        suspendida();
        assertTrue(pasa(metodo, ruta, new MockHttpServletResponse()));
    }

    @Test
    @DisplayName("Comprador que no es dueño de tienda no se ve afectado")
    void compradorNoAfectado() throws Exception {
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(null);
        for (String[] r : new String[][]{{"POST", "/api/payments/checkout"}, {"GET", "/api/mis-pedidos"},
                {"POST", "/api/carrito/items"}, {"GET", "/api/productos"}}) {
            assertTrue(pasa(r[0], r[1], new MockHttpServletResponse()), r[1]);
        }
        verifyNoInteractions(repo);
    }

    @Test
    @DisplayName("Tienda activa pasa en todo")
    void activaPasa() throws Exception {
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(7L);
        when(repo.findEstadoEmpresaById(7L)).thenReturn(Optional.of("ACTIVO"));
        assertTrue(pasa("GET", "/api/productos", new MockHttpServletResponse()));
        assertTrue(pasa("POST", "/api/pos/ventas", new MockHttpServletResponse()));
    }

    @Test
    @DisplayName("(d) al confirmar el pago se reactiva y vuelve el acceso")
    void pagoReactivaYVuelveAcceso() throws Exception {
        Empresa e = new Empresa();
        e.setEstadoEmpresa("SUSPENDIDO_IMPAGO");
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(7L);
        when(repo.findEstadoEmpresaById(7L)).thenAnswer(inv -> Optional.of(e.getEstadoEmpresa()));
        assertFalse(pasa("GET", "/api/productos", new MockHttpServletResponse()));
        SuspensionImpago.reactivarSiSuspendida(e);
        assertTrue(pasa("GET", "/api/productos", new MockHttpServletResponse()));
        assertTrue(pasa("POST", "/api/pos/ventas", new MockHttpServletResponse()));
    }
}

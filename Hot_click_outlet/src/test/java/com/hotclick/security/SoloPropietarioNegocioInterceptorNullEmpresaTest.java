package com.hotclick.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/** Seguridad #376 (BAJO): sin negocio resuelto el interceptor falla cerrado (403), no deja pasar. */
@DisplayName("[BAJO] SoloPropietarioNegocioInterceptor: empresaId nulo → 403 (falla cerrado)")
class SoloPropietarioNegocioInterceptorNullEmpresaTest {

    private final PropietarioGuard guard = mock(PropietarioGuard.class);
    private final CompanyScope scope = mock(CompanyScope.class);
    private final SoloPropietarioNegocioInterceptor interceptor =
        new SoloPropietarioNegocioInterceptor(guard, scope, new ObjectMapper());

    private MockHttpServletResponse llamar(String metodo, boolean[] pasa) throws Exception {
        MockHttpServletResponse res = new MockHttpServletResponse();
        pasa[0] = interceptor.preHandle(new MockHttpServletRequest(metodo, "/api/admin/dashboard"), res, new Object());
        return res;
    }

    @Test
    @DisplayName("no ADMIN y empresaId nulo → 403 con mensaje de propietario, sin consultar la guarda")
    void empresaNula403() throws Exception {
        when(scope.isAdminIT()).thenReturn(false);
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(null);
        boolean[] pasa = new boolean[1];
        MockHttpServletResponse res = llamar("GET", pasa);
        assertThat(pasa[0]).isFalse();
        assertThat(res.getStatus()).isEqualTo(403);
        assertThat(res.getContentAsString()).contains(PropietarioGuard.MSG);
        verify(guard, never()).puedeGestionarEmpresa(anyLong());
    }

    @Test
    @DisplayName("ADMIN de plataforma sin negocio sigue pasando")
    void adminSinNegocioPasa() throws Exception {
        when(scope.isAdminIT()).thenReturn(true);
        boolean[] pasa = new boolean[1];
        llamar("GET", pasa);
        assertThat(pasa[0]).isTrue();
    }

    @Test
    @DisplayName("propietario con negocio pasa; no propietario → 403; OPTIONS (preflight CORS) pasa")
    void propietarioYNoPropietario() throws Exception {
        when(scope.isAdminIT()).thenReturn(false);
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(7L);
        boolean[] pasa = new boolean[1];
        when(guard.puedeGestionarEmpresa(7L)).thenReturn(true);
        llamar("GET", pasa);
        assertThat(pasa[0]).isTrue();
        when(guard.puedeGestionarEmpresa(7L)).thenReturn(false);
        assertThat(llamar("GET", pasa).getStatus()).isEqualTo(403);
        assertThat(pasa[0]).isFalse();
        llamar("OPTIONS", pasa);
        assertThat(pasa[0]).isTrue();
    }
}

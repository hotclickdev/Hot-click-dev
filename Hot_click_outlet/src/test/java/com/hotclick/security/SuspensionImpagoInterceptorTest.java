package com.hotclick.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SuspensionImpagoInterceptorTest {

    private final CompanyScope scope = mock(CompanyScope.class);
    private final EmpresaRepository repo = mock(EmpresaRepository.class);
    private final SuspensionImpagoInterceptor it = new SuspensionImpagoInterceptor(scope, repo, new ObjectMapper());

    @Test
    void negocioSuspendidoNoPuedeEscribir() throws Exception {
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(7L);
        when(repo.findEstadoEmpresaById(7L)).thenReturn(Optional.of("SUSPENDIDO_IMPAGO"));
        MockHttpServletResponse res = new MockHttpServletResponse();
        assertFalse(it.preHandle(new MockHttpServletRequest("POST", "/api/productos"), res, new Object()));
        assertEquals(402, res.getStatus());
        assertTrue(res.getContentAsString().contains("SUSCRIPCION_IMPAGA"));
    }

    @Test
    void negocioActivoYLecturasPasan() throws Exception {
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(7L);
        when(repo.findEstadoEmpresaById(7L)).thenReturn(Optional.of("ACTIVO"));
        assertTrue(it.preHandle(new MockHttpServletRequest("POST", "/api/productos"), new MockHttpServletResponse(), new Object()));
        assertTrue(it.preHandle(new MockHttpServletRequest("GET", "/api/productos"), new MockHttpServletResponse(), new Object()));
    }
}

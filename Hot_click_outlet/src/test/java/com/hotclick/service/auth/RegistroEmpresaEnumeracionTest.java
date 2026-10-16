package com.hotclick.service.auth;

import com.hotclick.dto.RegistroEmpresaDTO;
import com.hotclick.exception.RegistroDuplicadoException;
import com.hotclick.service.EmprendedorRegistroService;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.TurnstileService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("S1-18 | registro-empresa: correo ya registrado con enlace de recuperar y piso de tiempo")
class RegistroEmpresaEnumeracionTest {

    private AuthRegistroEmpresaHandler handler(EmprendedorRegistroService reg, long minMs) {
        AuthRegistroEmpresaHandler h = new AuthRegistroEmpresaHandler();
        TurnstileService ts = mock(TurnstileService.class);
        when(ts.verify(any(), any())).thenReturn(true);
        ReflectionTestUtils.setField(h, "turnstileService", ts);
        ReflectionTestUtils.setField(h, "securityAuditService", mock(SecurityAuditService.class));
        ReflectionTestUtils.setField(h, "emprendedorRegistroService", reg);
        ReflectionTestUtils.setField(h, "respuestaMinMs", minMs);
        return h;
    }

    private static RegistroEmpresaDTO dto() {
        RegistroEmpresaDTO d = new RegistroEmpresaDTO();
        d.setDeclaraMayoriaEdad(true);
        return d;
    }

    @Test
    void correoYaRegistradoSoloConEnlaceDeRecuperar() throws Exception {
        EmprendedorRegistroService reg = mock(EmprendedorRegistroService.class);
        when(reg.registrar(any())).thenThrow(RegistroDuplicadoException.porCorreo());
        var r = handler(reg, 0).registroEmpresa(dto(), new MockHttpServletRequest());
        assertThat(r.getStatusCode().value()).isEqualTo(400);
        assertThat(r.getBody().getMessage()).isEqualTo(RegistroDuplicadoException.MENSAJE_CORREO);
        // Ningún otro dato: ni negocio, ni plan.
        assertThat(r.getBody().getData()).isEqualTo(java.util.Map.of("recuperar", RegistroDuplicadoException.RUTA_RECUPERAR));
    }

    @Test
    void duplicadoEsperaElPiso() throws Exception {
        EmprendedorRegistroService reg = mock(EmprendedorRegistroService.class);
        when(reg.registrar(any())).thenThrow(RegistroDuplicadoException.porCorreo());
        long t0 = System.nanoTime();
        handler(reg, 200).registroEmpresa(dto(), new MockHttpServletRequest());
        assertThat((System.nanoTime() - t0) / 1_000_000L).isGreaterThanOrEqualTo(195L);
    }
}

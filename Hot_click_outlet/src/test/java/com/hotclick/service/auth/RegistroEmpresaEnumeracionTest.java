package com.hotclick.service.auth;

import com.hotclick.dto.RegistroEmpresaDTO;
import com.hotclick.exception.CorreoYaRegistradoException;
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

@DisplayName("S1-18 | registro-empresa: mismo 400, mismo texto y mismo piso de tiempo exista o no la cuenta")
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
    void correoDeCuentaYCorreoDeEmpresaRespondenIgual() throws Exception {
        EmprendedorRegistroService porCuenta = mock(EmprendedorRegistroService.class);
        when(porCuenta.registrar(any())).thenThrow(new CorreoYaRegistradoException());
        EmprendedorRegistroService porEmpresa = mock(EmprendedorRegistroService.class);
        when(porEmpresa.registrar(any())).thenThrow(new RegistroDuplicadoException(RegistroDuplicadoException.MENSAJE_EMPRESA));

        var r1 = handler(porCuenta, 0).registroEmpresa(dto(), new MockHttpServletRequest());
        var r2 = handler(porEmpresa, 0).registroEmpresa(dto(), new MockHttpServletRequest());
        assertThat(r1.getStatusCode().value()).isEqualTo(400).isEqualTo(r2.getStatusCode().value());
        assertThat(r1.getBody().getMessage()).isEqualTo(r2.getBody().getMessage())
            .contains("¿Ya tenés cuenta? Iniciá sesión o recuperá tu contraseña");
        assertThat(r1.getBody().getData()).isNull();
    }

    @Test
    void duplicadoEsperaElPiso() throws Exception {
        EmprendedorRegistroService reg = mock(EmprendedorRegistroService.class);
        when(reg.registrar(any())).thenThrow(new CorreoYaRegistradoException());
        long t0 = System.nanoTime();
        handler(reg, 200).registroEmpresa(dto(), new MockHttpServletRequest());
        assertThat((System.nanoTime() - t0) / 1_000_000L).isGreaterThanOrEqualTo(195L);
    }
}

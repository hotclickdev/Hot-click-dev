package com.hotclick.controller;

import com.hotclick.dto.TiendaRapidaAceptarDTO;
import com.hotclick.exception.RegistroDuplicadoException;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.service.PasswordResetService;
import com.hotclick.service.consola.IpConsentimientoHasher;
import com.hotclick.service.consola.TiendaRapidaService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("S1-18 | tienda rápida: correo ya registrado con solo «Recuperar cuenta» y el piso de tiempo; sin cédula")
class TiendaRapidaEnumeracionTest {

    @Test
    void duplicadoGenericoYConPiso() {
        TiendaRapidaService tiendas = mock(TiendaRapidaService.class);
        when(tiendas.aceptar(any(), anyBoolean(), any(), any(), any(), any(), any()))
            .thenThrow(RegistroDuplicadoException.porCorreo());
        ClientIpResolver ips = mock(ClientIpResolver.class);
        IpConsentimientoHasher hasher = mock(IpConsentimientoHasher.class);
        TiendaRapidaPublicController c = new TiendaRapidaPublicController(tiendas, ips, hasher, mock(PasswordResetService.class));
        ReflectionTestUtils.setField(c, "respuestaMinMs", 200L);

        var body = new TiendaRapidaAceptarDTO(true, "v1", "Ana Mora", "ya@test.cr", "88887777");
        long t0 = System.nanoTime();
        var r = c.aceptar("tok", body, new MockHttpServletRequest());
        long ms = (System.nanoTime() - t0) / 1_000_000L;

        assertThat(r.getStatusCode().value()).isEqualTo(400);
        assertThat(r.getBody().getMessage()).isEqualTo(RegistroDuplicadoException.MENSAJE_CORREO);
        assertThat(r.getBody().getData()).isEqualTo(java.util.Map.of("recuperar", RegistroDuplicadoException.RUTA_RECUPERAR));
        assertThat(ms).isGreaterThanOrEqualTo(195L);
    }
}

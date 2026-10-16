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

@DisplayName("S1-18 | tienda rápida: correo o cédula duplicados con el mensaje genérico y el piso de tiempo")
class TiendaRapidaEnumeracionTest {

    @Test
    void duplicadoGenericoYConPiso() {
        TiendaRapidaService tiendas = mock(TiendaRapidaService.class);
        when(tiendas.aceptar(any(), anyBoolean(), any(), any(), any(), any(), any(), any()))
            .thenThrow(RegistroDuplicadoException.porCedula());
        ClientIpResolver ips = mock(ClientIpResolver.class);
        IpConsentimientoHasher hasher = mock(IpConsentimientoHasher.class);
        TiendaRapidaPublicController c = new TiendaRapidaPublicController(tiendas, ips, hasher, mock(PasswordResetService.class));
        ReflectionTestUtils.setField(c, "respuestaMinMs", 200L);

        var body = new TiendaRapidaAceptarDTO(true, "v1", "Ana Mora", "101110111", "ya@test.cr", "88887777");
        long t0 = System.nanoTime();
        var r = c.aceptar("tok", body, new MockHttpServletRequest());
        long ms = (System.nanoTime() - t0) / 1_000_000L;

        assertThat(r.getStatusCode().value()).isEqualTo(400);
        assertThat(r.getBody().getMessage()).isEqualTo(RegistroDuplicadoException.MENSAJE)
            .doesNotContainIgnoringCase("cédula").doesNotContainIgnoringCase("correo");
        assertThat(r.getBody().getData()).isNull();
        assertThat(ms).isGreaterThanOrEqualTo(195L);
    }
}

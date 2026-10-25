package com.hotclick.service.sinpe;

import com.hotclick.model.ComprobanteSinpe;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.ComprobanteSinpeRepository;
import com.hotclick.service.SupabaseStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("C1 | comprobante SINPE privado: URL firmada solo para el dueño o admin de plataforma")
class ComprobantePrivadoUrlFirmadaTest {

    @Mock ComprobanteSinpeRepository comprobanteRepository;
    @Mock SupabaseStorageService storageService;
    @InjectMocks SinpeComprobanteService service;

    @BeforeEach
    void armar() {
        Usuario u = new Usuario();
        u.setCorreo("duena@x.cr");
        Pedido p = new Pedido();
        p.setUsuarioFinal(u);
        ComprobanteSinpe c = new ComprobanteSinpe();
        c.setPedido(p);
        c.setUrlComprobante("privado/comprobantes-sinpe/a.png");
        when(comprobanteRepository.findById(1L)).thenReturn(Optional.of(c));
        when(storageService.claveDeComprobante(anyString())).thenAnswer(i -> i.getArgument(0));
        when(storageService.urlFirmada(anyString(), any())).thenReturn("https://firmada");
    }

    @Test
    void duenoObtieneUrl() {
        assertThat(service.urlFirmadaComprobante(1L, "DUENA@x.cr", false)).isEqualTo("https://firmada");
    }

    @Test
    void otroUsuarioNoObtieneUrl() {
        assertThatThrownBy(() -> service.urlFirmadaComprobante(1L, "otro@x.cr", false)).isInstanceOf(SecurityException.class);
        assertThatThrownBy(() -> service.urlFirmadaComprobante(1L, null, false)).isInstanceOf(SecurityException.class);
        verify(storageService, never()).urlFirmada(anyString(), any());
    }

    @Test
    void adminPlataformaObtieneUrl() {
        assertThat(service.urlFirmadaComprobante(1L, "admin@x.cr", true)).isEqualTo("https://firmada");
    }

    @Test
    void claveDesdeUrlPublicaVieja() {
        SupabaseStorageService s = new SupabaseStorageService(mock(software.amazon.awssdk.services.s3.S3Client.class));
        ReflectionTestUtils.setField(s, "publicUrl", "https://b.s3.amazonaws.com");
        assertThat(s.claveDeComprobante("https://b.s3.amazonaws.com/comprobantes-sinpe/x.png")).isEqualTo("comprobantes-sinpe/x.png");
        assertThat(s.claveDeComprobante("https://otro.com/comprobantes-sinpe/x.png")).isNull();
        assertThat(s.claveDeComprobante("privado/comprobantes-sinpe/y.png")).isEqualTo("privado/comprobantes-sinpe/y.png");
        assertThatThrownBy(() -> s.urlFirmada("k", java.time.Duration.ofSeconds(5))).isInstanceOf(IllegalStateException.class);
    }
}

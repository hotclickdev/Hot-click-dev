package com.hotclick.service;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("UbicacionDespachoService — ubicación obligatoria para publicar")
class UbicacionDespachoServiceTest {

    @Mock private BodegaRepository bodegaRepository;
    @Mock private EmpresaRepository empresaRepository;
    @InjectMocks private UbicacionDespachoService service;

    private Bodega bodega;

    @BeforeEach
    void setUp() {
        Empresa empresa = new Empresa();
        empresa.setId(7L);
        empresa.setNombreComercial("Bruma Café");
        bodega = new Bodega();
        bodega.setDireccionExacta("Santa Ana centro");
        when(empresaRepository.findById(7L)).thenReturn(Optional.of(empresa));
        when(empresaRepository.findByEstadoEmpresaOrderByFechaRegistroAsc("ACTIVO")).thenReturn(List.of(empresa));
        when(bodegaRepository.findByEmpresaIdAndEstado(7L, Constants.ESTADO_ACTIVO)).thenReturn(List.of(bodega));
    }

    @Test
    @DisplayName("regla apagada → no bloquea aunque falte la ubicación")
    void apagada_noBloquea() {
        assertThat(service.bloqueaPublicacion(7L)).isFalse();
        assertThatCode(() -> service.exigirParaPublicar(7L)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("regla encendida sin provincia ni cantón → bloquea la publicación")
    void encendida_sinUbicacion_bloquea() {
        ReflectionTestUtils.setField(service, "obligatoria", true);

        assertThatThrownBy(() -> service.exigirParaPublicar(7L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage(UbicacionDespachoService.MENSAJE_FALTA_UBICACION);
        assertThat(service.activosSinUbicacion()).extracting(f -> f.get("id")).containsExactly(7L);
    }

    @Test
    @DisplayName("regla encendida con provincia, cantón y dirección → permite publicar")
    void encendida_conUbicacion_permite() {
        ReflectionTestUtils.setField(service, "obligatoria", true);
        bodega.setProvincia("San José");
        bodega.setCanton("Santa Ana");

        assertThat(service.bloqueaPublicacion(7L)).isFalse();
        assertThat(service.activosSinUbicacion()).isEmpty();
    }
}

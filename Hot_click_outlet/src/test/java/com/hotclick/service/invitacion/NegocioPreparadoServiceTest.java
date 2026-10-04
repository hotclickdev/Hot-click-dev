package com.hotclick.service.invitacion;

import com.hotclick.dto.ResultadoAltaCupo;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.service.AltaEmprendedorNotificador;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.CupoEmprendedorService;
import com.hotclick.service.ModeracionAdminAvisoService;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Negocio preparado por admin, sin propietario")
class NegocioPreparadoServiceTest {

    @Mock EmpresaRepository empresaRepository;
    @Mock PlanRepository planRepository;
    @Mock CupoEmprendedorService cupoEmprendedorService;
    @Mock AuthSupport authSupport;
    @Mock InputSanitizer sanitizer;
    @Mock ModeracionAdminAvisoService moderacionAdminAvisoService;
    @Mock AltaEmprendedorNotificador altaEmprendedorNotificador;
    @Mock AuditoriaAdminRegistroService auditoriaAdminRegistroService;

    @InjectMocks NegocioPreparadoService service;

    @Test
    @DisplayName("queda pendiente de aprobación y sin catálogo público")
    void creaPendiente() {
        when(sanitizer.cleanWithLimit(anyString(), anyInt())).thenAnswer(i -> i.getArgument(0));
        when(empresaRepository.existsByCorreoEmpresa("luna@hotclick.cr")).thenReturn(false);
        when(authSupport.slugify("Taller Luna")).thenReturn("taller-luna");
        when(empresaRepository.existsBySlug("taller-luna")).thenReturn(false);
        when(cupoEmprendedorService.aplicarAlta(any(), anyString())).thenAnswer(i -> {
            Empresa e = i.getArgument(0);
            e.setPlanSaas("EMPRENDEDOR");
            return ResultadoAltaCupo.pago(null);
        });
        when(empresaRepository.save(any())).thenAnswer(i -> {
            Empresa e = i.getArgument(0);
            e.setId(15L);
            return e;
        });

        var data = service.crear("Taller Luna", null, "luna@hotclick.cr", null, null);

        ArgumentCaptor<Empresa> captor = ArgumentCaptor.forClass(Empresa.class);
        verify(empresaRepository).save(captor.capture());
        assertThat(captor.getValue().getEstadoEmpresa()).isEqualTo("PENDIENTE_APROBACION");
        assertThat(captor.getValue().getVisibilidadPublica()).isFalse();
        assertThat(data.get("id")).isEqualTo(15L);
        assertThat(data.get("plan")).isEqualTo("EMPRENDEDOR");
    }

    @Test
    @DisplayName("correo repetido no crea otra empresa")
    void correoRepetido() {
        when(sanitizer.cleanWithLimit(anyString(), anyInt())).thenAnswer(i -> i.getArgument(0));
        when(empresaRepository.existsByCorreoEmpresa("luna@hotclick.cr")).thenReturn(true);

        assertThatThrownBy(() -> service.crear("Taller", null, "luna@hotclick.cr", null, "EMPRENDEDOR"))
            .isInstanceOf(IllegalArgumentException.class);
        verify(empresaRepository, never()).save(any());
    }
}

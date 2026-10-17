package com.hotclick.controller;

import com.hotclick.model.AuditoriaAdmin;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AUD-1: auditoría inmutable y cambios de comisión auditados")
class AdminComisionAuditoriaTest {

    @Mock EmpresaRepository empresaRepository;
    @Mock CompanyScope companyScope;
    @Mock AuditoriaAdminRegistroService auditoria;
    @InjectMocks AdminComisionController controller;

    @Test
    void auditoriaAdminEsImmutable() {
        assertThat(AuditoriaAdmin.class.isAnnotationPresent(org.hibernate.annotations.Immutable.class)).isTrue();
    }

    @Test
    void cambioDeComisionQuedaAuditado() {
        Empresa e = new Empresa();
        e.setId(5L);
        when(companyScope.requireEmpresaIdOrAdmin()).thenReturn(5L);
        when(empresaRepository.findById(5L)).thenReturn(Optional.of(e));

        var res = controller.actualizar(Map.of("pctComisionTarjeta", "4"), null);

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        verify(auditoria).registrar(eq("COMISION_ACTUALIZADA"), eq("EMPRESA"), eq(5L), eq(5L), contains("tarjeta=4"));
    }

    @Test
    void valorFueraDeRango400SinAuditar() {
        Empresa e = new Empresa();
        e.setId(5L);
        when(companyScope.requireEmpresaIdOrAdmin()).thenReturn(5L);
        when(empresaRepository.findById(5L)).thenReturn(Optional.of(e));

        var res = controller.actualizar(Map.of("pctComisionTarjeta", "90"), null);

        assertThat(res.getStatusCode().value()).isEqualTo(400);
        verify(auditoria, never()).registrar(anyString(), anyString(), eq(5L), eq(5L), anyString());
    }
}

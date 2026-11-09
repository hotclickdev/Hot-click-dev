package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("El slug de cupones no resuelve una tienda sin membresia")
class EmpresaServiceSlugMembresiaTest {

    @Test
    void obtenerIdPorSlug_ocultaRequiereMembresia() {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        Empresa empresa = new Empresa();
        empresa.setId(4L);
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setVisibilidadPublica(true);
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        empresa.setNombreEmpresa("Oculta");
        when(repo.findBySlug("oculta")).thenReturn(Optional.of(empresa));

        assertThat(new EmpresaService(repo).obtenerIdPorSlug("oculta")).isEmpty();

        empresa.setEstadoPlan("ACTIVO");
        assertThat(new EmpresaService(repo).obtenerIdPorSlug("oculta")).contains(4L);
    }
}

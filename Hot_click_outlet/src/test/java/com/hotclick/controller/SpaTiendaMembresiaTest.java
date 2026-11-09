package com.hotclick.controller;

import com.hotclick.controller.spa.SpaSeoSupport;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("El SEO de /tienda/{slug} no publica una tienda sin membresia")
class SpaTiendaMembresiaTest {

    @Test
    void tiendaPage_noInyectaMetaSiRequiereMembresia() {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        SpaSeoSupport seo = mock(SpaSeoSupport.class);
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa("Tienda Secreta");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setVisibilidadPublica(true);
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        when(repo.findBySlug("secreta")).thenReturn(Optional.of(empresa));

        SpaController controller = new SpaController();
        ReflectionTestUtils.setField(controller, "empresaRepository", repo);
        ReflectionTestUtils.setField(controller, "spaSeoSupport", seo);
        ReflectionTestUtils.setField(controller, "indexHtmlContent", "<html>base</html>");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/tienda/secreta");

        String body = controller.tiendaPage("secreta", request).getBody();

        assertThat(body).isEqualTo("<html>base</html>");
        assertThat(body).doesNotContain("Tienda Secreta");
        verify(seo, never()).injectTiendaMeta(any(), any(), any());
    }
}

package com.hotclick.controller;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@DisplayName("QA2-014: el chat de la home (slug de plataforma) no responde 'Tienda no encontrada'")
class PublicChatControllerMarketplaceTest {

    private PublicChatController controller(EmpresaRepository empresas) {
        PublicChatController c = new PublicChatController();
        ReflectionTestUtils.setField(c, "empresaRepository", empresas);
        return c;
    }

    private static Empresa empresa(long id) {
        Empresa e = new Empresa();
        e.setId(id);
        return e;
    }

    @Test
    @DisplayName("Slug 'hotclick' sin empresa con ese slug: usa la primera empresa activa")
    void slugPlataformaSinFila_usaActiva() {
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        when(empresas.findBySlug("hotclick")).thenReturn(Optional.empty());
        when(empresas.findFirstByEstadoEmpresaOrderByIdAsc("ACTIVO")).thenReturn(Optional.of(empresa(4L)));

        assertThat(controller(empresas).resolverEmpresa("hotclick")).isEqualTo(4L);
    }

    @Test
    @DisplayName("Slug 'hotclick' con fila: la usa")
    void slugPlataformaConFila_laUsa() {
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        when(empresas.findBySlug("hotclick")).thenReturn(Optional.of(empresa(1L)));

        assertThat(controller(empresas).resolverEmpresa("hotclick")).isEqualTo(1L);
        verify(empresas, never()).findFirstByEstadoEmpresaOrderByIdAsc(any());
    }

    @Test
    @DisplayName("Slug de tienda inexistente: sigue sin resolver (no cae a otra empresa)")
    void slugTiendaInexistente_null() {
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        when(empresas.findBySlug("no-existe")).thenReturn(Optional.empty());

        assertThat(controller(empresas).resolverEmpresa("no-existe")).isNull();
        verify(empresas, never()).findFirstByEstadoEmpresaOrderByIdAsc(any());
    }
}

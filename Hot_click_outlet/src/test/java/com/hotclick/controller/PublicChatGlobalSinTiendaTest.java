package com.hotclick.controller;

import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("Asistente global sin tienda 'hotclick' en la base (prod tras reset)")
class PublicChatGlobalSinTiendaTest {

    private PublicChatController controller(EmpresaRepository repo) {
        PublicChatController c = mock(PublicChatController.class, org.mockito.Mockito.CALLS_REAL_METHODS);
        ReflectionTestUtils.setField(c, "empresaRepository", repo);
        return c;
    }

    @Test
    void globalSinEmpresasNoDaTiendaNoEncontrada() {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        when(repo.findBySlug(anyString())).thenReturn(Optional.empty());
        when(repo.findFirstByEstadoEmpresaOrderByIdAsc("ACTIVO")).thenReturn(Optional.empty());
        PublicChatController c = controller(repo);
        assertThat(c.resolverEmpresa(null)).isEqualTo(Constants.EMPRESA_PLATAFORMA_ID);
        assertThat(c.resolverEmpresa("hotclick")).isEqualTo(Constants.EMPRESA_PLATAFORMA_ID);
    }

    @Test
    void tiendaInexistenteSigueFallando() {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        when(repo.findBySlug(anyString())).thenReturn(Optional.empty());
        assertThat(controller(repo).resolverEmpresa("no-existe")).isNull();
    }
}

package com.hotclick.service.producto;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("EmpresaDestinoAlta — a qué negocio van los productos")
class EmpresaDestinoAltaTest {

    @Mock CompanyScope companyScope;
    @Mock EmpresaRepository empresaRepository;
    @InjectMocks EmpresaDestinoAlta destino;

    @Test
    @DisplayName("el vendedor usa su empresa y ignora el parámetro")
    void vendedorUsaEmpresaDeSesion() {
        Empresa propia = empresa(10L);
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(10L);
        when(empresaRepository.findById(10L)).thenReturn(Optional.of(propia));

        assertThat(destino.resolver(99L)).isSameAs(propia);
        verify(empresaRepository).findById(10L);
    }

    @Test
    @DisplayName("ADMIN sin empresaId no puede crear")
    void adminSinParametroRechaza() {
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(null);
        when(companyScope.isAdminIT()).thenReturn(true);

        assertThatThrownBy(() -> destino.resolver(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(EmpresaDestinoAlta.MSG_ELEGIR_EMPRESA);
    }

    @Test
    @DisplayName("ADMIN con empresaId asigna a ese negocio")
    void adminConParametroAsigna() {
        Empresa tienda = empresa(22L);
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(null);
        when(companyScope.isAdminIT()).thenReturn(true);
        when(empresaRepository.findById(22L)).thenReturn(Optional.of(tienda));

        assertThat(destino.resolver(22L)).isSameAs(tienda);
    }

    @Test
    @DisplayName("ADMIN con empresa inexistente falla claro")
    void adminEmpresaAusente() {
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(null);
        when(companyScope.isAdminIT()).thenReturn(true);
        when(empresaRepository.findById(8L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> destino.resolver(8L))
            .isInstanceOf(RecursoNoEncontradoException.class)
            .hasMessageContaining("Empresa no encontrada");
    }

    @Test
    @DisplayName("rol sin empresa propia no opera catálogo ajeno")
    void noAdminSinEmpresaNiega() {
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(null);
        when(companyScope.isAdminIT()).thenReturn(false);

        assertThatThrownBy(() -> destino.resolver(22L))
            .isInstanceOf(TenantAccessDeniedException.class)
            .hasMessage(EmpresaDestinoAlta.MSG_SIN_NEGOCIO_PROPIO);
    }

    private static Empresa empresa(long id) {
        Empresa e = new Empresa();
        e.setId(id);
        return e;
    }
}

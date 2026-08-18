package com.hotclick.controller.producto;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Categoria;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Categorías POS del negocio")
class ProductoCatalogHandlerPosTest {

    @Mock CompanyScope companyScope;
    @Mock CategoriaRepository categoriaRepository;
    @InjectMocks ProductoCatalogHandler handler;

    @Test
    @DisplayName("Sin empresa en el token no lista el marketplace")
    void sinEmpresaNoLista() {
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(null);

        ResponseEntity<ResponseDTO> res = handler.categoriasPOS();

        assertThat(res.getStatusCode().value()).isEqualTo(400);
    }

    @Test
    @DisplayName("Lista solo categorías con productos de esa empresa")
    void listaSoloLasDelNegocio() {
        Categoria joyeria = new Categoria();
        joyeria.setId(3L);
        joyeria.setNombreCategoria("Joyería");
        when(companyScope.getCurrentEmpresaIdOrOwn()).thenReturn(11L);
        when(categoriaRepository.findConProductosDeEmpresa(11L, Constants.ESTADO_ACTIVO))
            .thenReturn(List.of(joyeria));

        ResponseEntity<ResponseDTO> res = handler.categoriasPOS();

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().getData()).isEqualTo(List.of(joyeria));
    }
}

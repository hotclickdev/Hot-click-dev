package com.hotclick.rag.controller.shoppingassistant;

import com.hotclick.model.Empresa;
import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.rag.service.VectorSearchService;
import com.hotclick.service.GoogleVisionService;
import com.hotclick.service.producto.ProductoCatalogQueries;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("B\u00fasqueda por foto - tienda y categor\u00eda de cada resultado (Figma 27:882)")
class ShoppingAssistantImageSearchHandlerTest {

    private static final byte[] PNG = { (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };

    @Test
    @DisplayName("Cada producto trae la categor\u00eda del cat\u00e1logo y la tienda solo si es visible")
    @SuppressWarnings("unchecked")
    void incluyeTiendaYCategoria() throws Exception {
        ShoppingAssistantTenantGuard guard = mock(ShoppingAssistantTenantGuard.class);
        VectorSearchService vector = mock(VectorSearchService.class);
        GoogleVisionService vision = mock(GoogleVisionService.class);
        ProductoCatalogQueries queries = mock(ProductoCatalogQueries.class);

        Empresa empresa = new Empresa();
        empresa.setId(1L);
        when(guard.requireEmpresaActivaForImageSearch("hotclick")).thenReturn(empresa);
        GoogleVisionService.VisionResult resultado = new GoogleVisionService.VisionResult();
        resultado.labelsFisicos.add("Chair");
        when(vision.analizar(anyString())).thenReturn(resultado);
        when(vector.buscarSimilares(anyLong(), anyString(), anyInt(), anyBoolean())).thenReturn(List.of(
            new ProductoContexto(10L, "Silla", "S1", 5000, null, null, 3, null, "Muebles", null, null),
            new ProductoContexto(11L, "Banco", "B1", 4000, null, null, 2, null, "Muebles", null, null)));
        when(queries.tiendasVisibles(anyCollection())).thenReturn(Map.of(10L, "Casa Luna"));

        ShoppingAssistantImageSearchHandler handler = new ShoppingAssistantImageSearchHandler(guard, vector, vision, queries);
        Map<String, Object> body = handler.searchByImage(new MockMultipartFile("image", "f.png", "image/png", PNG), "hotclick", null).getBody();

        List<Map<String, Object>> productos = (List<Map<String, Object>>) body.get("productos");
        assertThat(productos.get(0)).containsEntry("empresaNombre", "Casa Luna").containsEntry("categoria", "Muebles");
        assertThat(productos.get(1)).containsEntry("empresaNombre", null).containsEntry("categoria", "Muebles");
    }

    @Test
    @DisplayName("La etiqueta de Vision entra a la búsqueda aunque no haya entidades web")
    void buscaConEtiquetaCuandoNoHayEntidadesWeb() {
        ShoppingAssistantTenantGuard guard = mock(ShoppingAssistantTenantGuard.class);
        VectorSearchService vector = mock(VectorSearchService.class);
        GoogleVisionService vision = mock(GoogleVisionService.class);
        ProductoCatalogQueries queries = mock(ProductoCatalogQueries.class);

        Empresa empresa = new Empresa();
        empresa.setId(1L);
        when(guard.requireEmpresaActivaForImageSearch("hotclick")).thenReturn(empresa);
        GoogleVisionService.VisionResult resultado = new GoogleVisionService.VisionResult();
        resultado.etiquetas.add("Sillón verde");
        when(vision.analizar(anyString())).thenReturn(resultado);
        when(vector.buscarSimilares(anyLong(), anyString(), anyInt(), anyBoolean())).thenReturn(List.of());
        when(queries.tiendasVisibles(anyCollection())).thenReturn(Map.of());

        ShoppingAssistantImageSearchHandler handler = new ShoppingAssistantImageSearchHandler(guard, vector, vision, queries);
        handler.searchByImage(new MockMultipartFile("image", "f.png", "image/png", PNG), "hotclick", null);

        verify(vector).buscarSimilares(eq(1L), eq("Sillón verde"), eq(5), anyBoolean());
    }
}

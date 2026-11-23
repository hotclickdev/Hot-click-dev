package com.hotclick.seo.indexnow;

import com.hotclick.model.BlogEntrada;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("BlogEntradaIndexNowListener")
@SuppressWarnings("unchecked")
class BlogEntradaIndexNowListenerTest {

    private static BlogEntrada entrada() {
        BlogEntrada e = new BlogEntrada();
        e.setSlug("mi-articulo");
        return e;
    }

    @Test
    @DisplayName("PostPersist y PostUpdate avisan el slug")
    void avisaSlug() {
        IndexNowService servicio = mock(IndexNowService.class);
        ObjectProvider<IndexNowService> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(servicio);
        BlogEntradaIndexNowListener listener = new BlogEntradaIndexNowListener();
        ReflectionTestUtils.setField(listener, "indexNow", provider);

        listener.alCrear(entrada());
        listener.alActualizar(entrada());

        verify(servicio, times(2)).notificarArticulo("mi-articulo");
    }

    @Test
    @DisplayName("sin IndexNow disponible no hace nada")
    void providerVacio() {
        ObjectProvider<IndexNowService> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);
        BlogEntradaIndexNowListener listener = new BlogEntradaIndexNowListener();
        ReflectionTestUtils.setField(listener, "indexNow", provider);

        assertThatCode(() -> listener.alCrear(entrada())).doesNotThrowAnyException();
    }
}

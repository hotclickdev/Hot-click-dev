package com.hotclick.seo.indexnow;

import com.hotclick.model.BlogEntrada;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PostUpdate;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Avisa a IndexNow cuando se crea o cambia un artículo del blog (el borrado es soft: estado=0 + save).
 * {@link IndexNowService} espera al commit si hay transacción. Sin servicio disponible, no hace nada.
 */
public class BlogEntradaIndexNowListener {

    @Autowired
    private ObjectProvider<IndexNowService> indexNow;

    @PostPersist
    void alCrear(BlogEntrada entrada) {
        avisar(entrada);
    }

    @PostUpdate
    void alActualizar(BlogEntrada entrada) {
        avisar(entrada);
    }

    private void avisar(BlogEntrada entrada) {
        if (entrada == null || indexNow == null) return;
        IndexNowService servicio = indexNow.getIfAvailable();
        if (servicio != null) servicio.notificarArticulo(entrada.getSlug());
    }
}

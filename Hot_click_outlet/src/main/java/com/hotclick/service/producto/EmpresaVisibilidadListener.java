package com.hotclick.service.producto;

import com.hotclick.model.Empresa;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostUpdate;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * BUG-S1-12: el catálogo público (páginas, búsqueda, destacados, carrusel, marca y categoría) se
 * cachea 60 s en «productos-publicos». Suspender, inactivar, rechazar, cerrar la prueba o apagar la
 * visibilidad de un negocio no vaciaba ese caché y sus productos seguían en la búsqueda.
 * Cualquier UPDATE de {@link Empresa} que cambie si es pública vacía el caché DESPUÉS del commit
 * (antes del commit, otra lectura podría volver a cachear lo viejo).
 *
 * <p>Hibernate crea el listener con el SpringBeanContainer de Spring Boot, por eso el campo se inyecta.
 */
public class EmpresaVisibilidadListener {

    @Autowired
    private ObjectProvider<ProductoCacheEvictor> evictor;

    @PostLoad
    void alCargar(Empresa empresa) {
        empresa.recordarPublicoCargado();
    }

    @PostUpdate
    void alActualizar(Empresa empresa) {
        boolean cambio = empresa.cambioVisibilidadPublica();
        empresa.recordarPublicoCargado();
        if (!cambio) return;
        ProductoCacheEvictor e = evictor != null ? evictor.getIfAvailable() : null;
        if (e == null) return;
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            e.evictProductosPublicos();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                e.evictProductosPublicos();
            }
        });
    }
}

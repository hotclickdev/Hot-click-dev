package com.hotclick.service.reposicion;

import com.hotclick.model.Producto;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostUpdate;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Punto único para «Avisame cuando vuelva»: todo cambio de stock (ajuste de entrada, compras,
 * edición, importación, devoluciones POS, liberación de reservas) termina en un UPDATE de
 * {@link Producto}. Si el stock disponible pasa de 0 a más de 0, el aviso por correo se agenda
 * para DESPUÉS del commit (un rollback no avisa).
 *
 * <p>Hibernate crea el listener con el SpringBeanContainer de Spring Boot, por eso el campo se inyecta.
 * Los UPDATE masivos por JPQL/SQL no pasan por aquí; hoy no hay ninguno sobre stock_actual.
 */
public class ProductoStockListener {

    @Autowired
    private ObjectProvider<AvisoReposicionService> avisoReposicion;

    @PostLoad
    void alCargar(Producto producto) {
        producto.recordarStockDisponibleCargado();
    }

    @PostUpdate
    void alActualizar(Producto producto) {
        if (!producto.volvioAHaberStock() || producto.getId() == null) {
            producto.recordarStockDisponibleCargado();
            return;
        }
        producto.recordarStockDisponibleCargado(); // un segundo flush en la misma TX no vuelve a agendar
        AvisoReposicionService servicio = avisoReposicion != null ? avisoReposicion.getIfAvailable() : null;
        if (servicio == null) return;
        Long productoId = producto.getId();
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            servicio.avisarSuscriptores(productoId);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                servicio.avisarSuscriptores(productoId);
            }
        });
    }
}

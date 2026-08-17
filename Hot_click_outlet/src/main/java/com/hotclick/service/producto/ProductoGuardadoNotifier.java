package com.hotclick.service.producto;

import com.hotclick.model.Producto;
import com.hotclick.rag.event.ProductoGuardadoEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
public class ProductoGuardadoNotifier {

    private final ApplicationEventPublisher eventPublisher;

    public ProductoGuardadoNotifier(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    public void publish(Object source, Producto saved, Long empresaId) {
        eventPublisher.publishEvent(new ProductoGuardadoEvent(
            source,
            saved.getId(),
            empresaId,
            saved.getNombreProducto(),
            saved.getDescripcionCorta(),
            saved.getMarcaTexto(),
            saved.getSku(),
            saved.getTags(),
            saved.getEspecificaciones()
        ));
    }
}

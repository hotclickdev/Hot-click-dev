package com.hotclick.service.producto;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Bodega;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Única regla de pertenencia de la bodega de un producto (IDOR de bodega, hallazgo MEDIO de Seguridad).
 * La usan el alta, la edición, el bulk y la importación (todas pasan por
 * {@link ProductoWriteOperations} y {@link ProductoUpdater}).
 * <p>
 * Una bodega ajena responde igual que una inexistente ({@link RecursoNoEncontradoException}, mismo mensaje):
 * no se revela que existe ni su nombre, provincia o cantón. Mismo criterio que
 * {@code CheckoutValidator.assertBodegaTenant}, con la misma excepción para HotClick: la bodega de la
 * plataforma (o sin empresa) solo sirve a productos de la plataforma (o sin empresa).
 */
@Component
public class BodegaTenantGuard {

    private static final Logger log = LoggerFactory.getLogger(BodegaTenantGuard.class);

    private final BodegaRepository bodegaRepository;

    public BodegaTenantGuard(BodegaRepository bodegaRepository) {
        this.bodegaRepository = bodegaRepository;
    }

    /**
     * Devuelve la bodega si es del negocio {@code empresaId}; si no existe o es de otro negocio lanza
     * {@link RecursoNoEncontradoException} (404/400 según el handler, sin datos de la bodega).
     */
    public Bodega exigirDeLaEmpresa(Long bodegaId, Long empresaId) {
        Bodega bodega = bodegaRepository.findById(bodegaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Bodega", bodegaId));
        if (!perteneceA(bodega, empresaId)) {
            log.warn("[producto] Bodega ajena bloqueada: bodegaId={}, bodega.empresaId={}, empresaId={}",
                bodegaId, bodega.getEmpresaId(), empresaId);
            throw new RecursoNoEncontradoException("Bodega", bodegaId);
        }
        return bodega;
    }

    static boolean perteneceA(Bodega bodega, Long empresaId) {
        Long duenia = bodega.getEmpresaId();
        if (duenia != null && duenia.equals(empresaId)) return true;
        boolean bodegaDePlataforma = duenia == null || Constants.esEmpresaPlataforma(duenia);
        boolean productoDePlataforma = empresaId == null || Constants.esEmpresaPlataforma(empresaId);
        return bodegaDePlataforma && productoDePlataforma;
    }
}

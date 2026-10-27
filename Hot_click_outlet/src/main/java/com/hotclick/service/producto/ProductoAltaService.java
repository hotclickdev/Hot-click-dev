package com.hotclick.service.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.service.ProductoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Pipeline único del alta de un producto: campos solo-admin, moderación de texto y creación.
 * Lo usan el alta individual ({@code ProductoCreateHandler}) y el bulk
 * ({@code ProductoBulkOperationsService}) para que ninguno se salte reglas (Auditor 3, A-1).
 * Después de crear, quien llama aplica {@link ProductoApprovalService#aplicarReglasPublicacion}.
 */
@Service
public class ProductoAltaService {

    public static final String MENSAJE_CONTENIDO_NO_PERMITIDO =
        "El contenido del producto no está permitido en la plataforma";

    private final ProductoService productoService;
    private final ProductoAccessGuard productoAccessGuard;
    private final ProductoModerationFacade productoModerationFacade;
    private final ProductoRequestSanitizer productoRequestSanitizer;
    private final ProductoApprovalService productoApprovalService;

    public ProductoAltaService(ProductoService productoService,
                               ProductoAccessGuard productoAccessGuard,
                               ProductoModerationFacade productoModerationFacade,
                               ProductoRequestSanitizer productoRequestSanitizer,
                               ProductoApprovalService productoApprovalService) {
        this.productoService = productoService;
        this.productoAccessGuard = productoAccessGuard;
        this.productoModerationFacade = productoModerationFacade;
        this.productoRequestSanitizer = productoRequestSanitizer;
        this.productoApprovalService = productoApprovalService;
    }

    /** @throws ContenidoNoPermitidoException si la moderación de texto rechaza el producto. */
    public Producto crearSaneado(ProductoRequestDTO dto, String adminCorreo, Empresa empresa) {
        productoRequestSanitizer.restringirCamposSoloAdmin(dto, productoAccessGuard.hasRole("ADMIN"));
        if (!productoModerationFacade.isTextoPermitido(dto)) {
            throw new ContenidoNoPermitidoException();
        }
        return productoService.crearProducto(dto, adminCorreo, empresa);
    }

    /**
     * Alta atómica: pipeline saneado + reglas de publicación del negocio en UNA transacción.
     * Si {@code aplicarReglasPublicacion} falla, el producto no queda guardado (nunca queda uno con
     * {@code visibleCatalogo=true} de un negocio sin aprobar). Esta es la entrada que deben usar todos los
     * caminos de alta; la auditoría va aparte, después del commit.
     */
    @Transactional
    public ProductoApprovalService.ProductoCreationResult crearYPublicar(
            ProductoRequestDTO dto, String adminCorreo, Empresa empresa) {
        Producto creado = crearSaneado(dto, adminCorreo, empresa);
        return productoApprovalService.aplicarReglasPublicacion(creado, empresa);
    }

    public static class ContenidoNoPermitidoException extends RuntimeException {
        public ContenidoNoPermitidoException() {
            super(MENSAJE_CONTENIDO_NO_PERMITIDO);
        }
    }
}

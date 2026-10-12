package com.hotclick.service.producto;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.security.CompanyScope;
import org.springframework.stereotype.Service;

@Service
public class ProductoAccessGuard {

    private final ProductoRepository productoRepository;
    private final CompanyScope companyScope;

    public ProductoAccessGuard(ProductoRepository productoRepository, CompanyScope companyScope) {
        this.productoRepository = productoRepository;
        this.companyScope = companyScope;
    }

    public Long getCurrentEmpresaId() {
        return companyScope.getCurrentEmpresaId();
    }

    public Long getCurrentEmpresaIdOrOwn() {
        return companyScope.getCurrentEmpresaIdOrOwn();
    }

    /** Empresa de gestión: null solo para IT Admin/staff; sin empresa → 403 EMPRESA_REQUERIDA. */
    public Long requireEmpresaIdOrAdmin() {
        return companyScope.requireEmpresaIdOrAdmin();
    }

    public boolean hasRole(String role) {
        return companyScope.hasRole(role);
    }

    public boolean isAdminIT() {
        return companyScope.isAdminIT();
    }

    public Usuario getCurrentUser() {
        return companyScope.getCurrentUser();
    }

    public void assertCanAccessNullable(Long empresaId) {
        companyScope.assertCanAccessNullable(empresaId);
    }

    public Producto getAccessibleProducto(Long productoId) {
        Producto producto = productoRepository.findById(productoId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado"));
        companyScope.assertCanAccessNullable(producto.getEmpresaId());
        return producto;
    }

    public void assertCanAccessProducto(Long productoId) {
        getAccessibleProducto(productoId);
    }

    /**
     * IDOR-10: el detalle por id es público, pero solo para productos publicables: activos, visibles en
     * catálogo y de un negocio ACTIVO con visibilidad pública (o de plataforma, sin empresa).
     * Lo demás → 404 salvo para el dueño o un ADMIN. Un vendedor de otro negocio sigue recibiendo 403.
     */
    public void assertCanAccessProductoDetalle(Producto producto) {
        if (companyScope.isAdminIT()) return;
        Long empresaId = companyScope.getCurrentEmpresaId();
        Long duenoId = producto.getEmpresa() != null ? producto.getEmpresa().getId() : null;
        if (empresaId != null && empresaId.equals(duenoId)) return;
        // F28: un vendedor de otro negocio sigue recibiendo 403 (la respuesta del panel trae campos internos).
        if (empresaId != null) companyScope.assertCanAccessNullable(duenoId);
        // ESC-1: borrado (estado 2), inactivo, oculto o de negocio no aprobado → 404 para todos los demás.
        if (!productoRepository.esPublicable(producto.getId())) {
            throw new RecursoNoEncontradoException("Producto no encontrado");
        }
    }

    /** IDOR-09: empresa de la sesión, nunca null (también para ADMIN); sin empresa → 403. */
    public Long requireEmpresaId() {
        return companyScope.requireEmpresaId();
    }
}

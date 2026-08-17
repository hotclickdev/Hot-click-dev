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

    public void assertCanAccessProductoDetalle(Producto producto) {
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId != null) {
            companyScope.assertCanAccessNullable(
                producto.getEmpresa() != null ? producto.getEmpresa().getId() : null);
        }
    }
}

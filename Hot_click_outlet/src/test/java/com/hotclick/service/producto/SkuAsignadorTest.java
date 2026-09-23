package com.hotclick.service.producto;

import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SKU autoincremental por empresa")
class SkuAsignadorTest {

    @Mock EmpresaRepository empresaRepository;
    @Mock ProductoRepository productoRepository;
    @InjectMocks SkuAsignador skuAsignador;

    @Test
    @DisplayName("El 4.º producto de un negocio es E{id}-0004, no el id global")
    void cuartoProductoDeLaEmpresa() {
        Empresa empresa = new Empresa();
        empresa.setId(12L);
        when(empresaRepository.findByIdForUpdate(12L)).thenReturn(Optional.of(empresa));
        when(productoRepository.maxNumeroLocalByEmpresaId(12L)).thenReturn(3);

        Producto producto = new Producto();
        skuAsignador.asignarSiguiente(producto, empresa);

        assertThat(producto.getNumeroLocal()).isEqualTo(4);
        assertThat(producto.getSku()).isEqualTo("E12-0004");
    }

    @Test
    @DisplayName("Otra empresa empieza en 0001 aunque la plataforma ya tenga productos")
    void otraEmpresaEmpiezaEnUno() {
        Empresa b = new Empresa();
        b.setId(99L);
        when(empresaRepository.findByIdForUpdate(99L)).thenReturn(Optional.of(b));
        when(productoRepository.maxNumeroLocalByEmpresaId(99L)).thenReturn(0);

        Producto producto = new Producto();
        skuAsignador.asignarSiguiente(producto, b);

        assertThat(producto.getNumeroLocal()).isEqualTo(1);
        assertThat(producto.getSku()).isEqualTo("E99-0001");
        assertThat(SkuEmpresa.formato(12L, 4)).isEqualTo("E12-0004");
    }
}

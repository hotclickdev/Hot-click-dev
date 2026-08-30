package com.hotclick.config;

import com.hotclick.model.Bodega;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.ApplicationArguments;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CatalogoLocalSeeder — solo H2 local")
class CatalogoLocalSeederTest {

    @Mock ProductoRepository productoRepository;
    @Mock EmpresaRepository empresaRepository;
    @Mock BodegaRepository bodegaRepository;
    @Mock CategoriaRepository categoriaRepository;
    @Mock UsuarioRepository usuarioRepository;

    @InjectMocks CatalogoLocalSeeder seeder;

    @Test
    @DisplayName("Si ya hay productos, no crea empresa ni SKU demo")
    void noSiembraSiElCatalogoYaTieneProductos() {
        when(productoRepository.count()).thenReturn(3L);

        seeder.run(mock(ApplicationArguments.class));

        verify(productoRepository, never()).save(any());
        verify(empresaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Sin admin de DataSeeder, no crea el café demo")
    void noSiembraSinAdmin() {
        when(productoRepository.count()).thenReturn(0L);
        when(productoRepository.findBySku(CatalogoLocalSeeder.SKU_DEMO)).thenReturn(Optional.empty());
        when(usuarioRepository.findByCorreo(CatalogoLocalSeeder.CORREO_ADMIN)).thenReturn(Optional.empty());

        seeder.run(mock(ApplicationArguments.class));

        verify(productoRepository, never()).save(any());
    }

    @Test
    @DisplayName("Catálogo vacío: crea empresa visible y el café comprable")
    void siembraCafeVisibleEnCatalogo() {
        when(productoRepository.count()).thenReturn(0L);
        when(productoRepository.findBySku(CatalogoLocalSeeder.SKU_DEMO)).thenReturn(Optional.empty());
        when(usuarioRepository.findByCorreo(CatalogoLocalSeeder.CORREO_ADMIN)).thenReturn(Optional.of(new Usuario()));
        when(empresaRepository.save(any(Empresa.class))).thenAnswer(inv -> inv.getArgument(0));
        when(bodegaRepository.save(any(Bodega.class))).thenAnswer(inv -> inv.getArgument(0));
        when(categoriaRepository.save(any(Categoria.class))).thenAnswer(inv -> inv.getArgument(0));
        when(productoRepository.save(any(Producto.class))).thenAnswer(inv -> inv.getArgument(0));

        seeder.run(mock(ApplicationArguments.class));

        verify(empresaRepository).save(argThat(e ->
            Boolean.TRUE.equals(e.getVisibilidadPublica()) && "ACTIVO".equals(e.getEstadoEmpresa())));
        verify(productoRepository).save(argThat(p ->
            CatalogoLocalSeeder.SKU_DEMO.equals(p.getSku())
                && CatalogoLocalSeeder.NOMBRE_DEMO.equals(p.getNombreProducto())
                && Boolean.TRUE.equals(p.getVisibleCatalogo())
                && p.getStockActual() != null
                && p.getStockActual() > 0
                && p.getEmpresa() != null));
    }
}

package com.hotclick.service;

import com.hotclick.model.Producto;
import com.hotclick.model.Testimonio;
import com.hotclick.model.Usuario;
import com.hotclick.repository.TestimonioRepository;
import com.hotclick.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("TestimonioService - mis testimonios con la foto del producto (Figma 30:1327)")
class TestimonioServiceMisTestimoniosTest {

    @Test
    @DisplayName("Cada opini\u00f3n trae la foto principal del producto; el testimonio general la deja vac\u00eda")
    void incluyeFotoDelProducto() {
        TestimonioRepository repo = mock(TestimonioRepository.class);
        UsuarioRepository usuarioRepo = mock(UsuarioRepository.class);
        TestimonioService service = new TestimonioService();
        ReflectionTestUtils.setField(service, "repo", repo);
        ReflectionTestUtils.setField(service, "usuarioRepo", usuarioRepo);

        Usuario usuario = new Usuario();
        usuario.setId(5L);
        when(usuarioRepo.findByCorreo("ana@hotclick.lat")).thenReturn(Optional.of(usuario));

        Producto producto = new Producto();
        producto.setId(10L);
        producto.setNombreProducto("Silla");
        producto.setImagenPrincipalUrl("https://cdn.hotclick.lat/silla.jpg");
        Testimonio resena = new Testimonio();
        resena.setProducto(producto);
        Testimonio general = new Testimonio();
        when(repo.findByUsuarioIdOrderByFechaCreacionDesc(5L)).thenReturn(List.of(resena, general));

        List<Map<String, Object>> lista = service.listarPorUsuario("ana@hotclick.lat");

        assertThat(lista.get(0)).containsEntry("productoImagenUrl", "https://cdn.hotclick.lat/silla.jpg").containsEntry("productoNombre", "Silla");
        assertThat(lista.get(1)).containsEntry("productoImagenUrl", null);
    }
}

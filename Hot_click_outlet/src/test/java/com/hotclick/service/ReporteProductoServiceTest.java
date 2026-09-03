package com.hotclick.service;

import com.hotclick.dto.ReporteProductoCreateRequest;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.model.ReporteProducto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.ReporteProductoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReporteProductoService — crear/resolver y casos borde")
class ReporteProductoServiceTest {

    @Mock ReporteProductoRepository repo;
    @Mock ProductoRepository productoRepository;
    @Mock CompanyScope companyScope;
    @Mock InputSanitizer sanitizer;
    @Mock ModeracionAdminAvisoService moderacionAdminAvisoService;
    @Mock ModeracionAvisoService moderacionAvisoService;
    @InjectMocks ReporteProductoService service;

    private Producto producto;
    private Empresa empresa;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setId(44L);
        producto = new Producto();
        producto.setId(10L);
        producto.setNombreProducto("Audífonos QA");
        producto.setVisibleCatalogo(true);
        producto.setEmpresa(empresa);
    }

    @Test
    void crear_motivoInvalido_rechaza() {
        ReporteProductoCreateRequest req = new ReporteProductoCreateRequest();
        req.setProductoId(10L);
        req.setMotivo("HACK");

        assertThatThrownBy(() -> service.crear(req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Motivo");
        verify(repo, never()).save(any());
    }

    @Test
    void crear_ok_avisaAdmin_noAvisaVendedor() {
        ReporteProductoCreateRequest req = new ReporteProductoCreateRequest();
        req.setProductoId(10L);
        req.setMotivo("SPAM");
        when(productoRepository.findById(10L)).thenReturn(Optional.of(producto));
        when(repo.save(any())).thenAnswer(inv -> {
            ReporteProducto r = inv.getArgument(0);
            r.setId(99L);
            return r;
        });

        var out = service.crear(req);

        assertThat(out.get("id")).isEqualTo(99L);
        verify(moderacionAdminAvisoService).avisarReporteProducto(99L, "Audífonos QA");
        verify(moderacionAvisoService, never()).avisarProductoModerado(any(), any(), anyBoolean(), any());
    }

    @Test
    void resolver_descartarSinNotas_noPausaNiAvisa() {
        ReporteProducto r = pendiente();
        when(repo.findById(1L)).thenReturn(Optional.of(r));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.resolver(1L, ReporteProducto.DESCARTADO, null, false);

        assertThat(producto.getVisibleCatalogo()).isTrue();
        verify(productoRepository, never()).save(any());
        verify(moderacionAvisoService, never()).avisarProductoModerado(any(), any(), anyBoolean(), any());
    }

    @Test
    void resolver_resueltoConPausa_ocultaYAvisa() {
        when(sanitizer.cleanWithLimit(anyString(), org.mockito.ArgumentMatchers.anyInt()))
            .thenAnswer(inv -> inv.getArgument(0));
        ReporteProducto r = pendiente();
        when(repo.findById(1L)).thenReturn(Optional.of(r));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.resolver(1L, ReporteProducto.RESUELTO, "Contenido engañoso", true);

        assertThat(producto.getVisibleCatalogo()).isFalse();
        verify(moderacionAvisoService).avisarProductoModerado(eq(44L), eq("Audífonos QA"), eq(true), eq("Contenido engañoso"));
    }

    @Test
    void resolver_yaResuelto_rechaza() {
        ReporteProducto r = pendiente();
        r.setEstado(ReporteProducto.RESUELTO);
        when(repo.findById(1L)).thenReturn(Optional.of(r));

        assertThatThrownBy(() -> service.resolver(1L, ReporteProducto.DESCARTADO, null, false))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("ya fue resuelto");
    }

    @Test
    void resolver_estadoInvalido_rechaza() {
        assertThatThrownBy(() -> service.resolver(1L, "BORRADO", null, false))
            .isInstanceOf(IllegalArgumentException.class);
        verify(repo, never()).findById(any());
    }

    @Test
    void resolver_pausarPeroYaOculto_sinNotas_noAvisa() {
        producto.setVisibleCatalogo(false);
        ReporteProducto r = pendiente();
        when(repo.findById(1L)).thenReturn(Optional.of(r));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.resolver(1L, ReporteProducto.RESUELTO, "   ", true);

        verify(productoRepository, never()).save(any());
        verify(moderacionAvisoService, never()).avisarProductoModerado(any(), any(), anyBoolean(), any());
    }

    @Test
    void resolver_inexistente_404() {
        when(repo.findById(404L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.resolver(404L, ReporteProducto.RESUELTO, null, false))
            .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void crear_productoInexistente_404() {
        ReporteProductoCreateRequest req = new ReporteProductoCreateRequest();
        req.setProductoId(404L);
        req.setMotivo("OTRO");
        when(productoRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.crear(req))
            .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void resolver_pausarConVisibleNull_igualPausa() {
        producto.setVisibleCatalogo(null);
        ReporteProducto r = pendiente();
        when(repo.findById(1L)).thenReturn(Optional.of(r));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.resolver(1L, ReporteProducto.RESUELTO, null, true);

        assertThat(producto.getVisibleCatalogo()).isFalse();
        verify(moderacionAvisoService).avisarProductoModerado(eq(44L), eq("Audífonos QA"), eq(true), isNull());
    }

    private ReporteProducto pendiente() {
        ReporteProducto r = new ReporteProducto();
        r.setId(1L);
        r.setProducto(producto);
        r.setMotivo("SPAM");
        r.setEstado(ReporteProducto.PENDIENTE);
        return r;
    }
}

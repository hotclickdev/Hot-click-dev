package com.hotclick.service.inventario;

import com.hotclick.dto.inventario.InventarioLookupDTO;
import com.hotclick.dto.inventario.PaqueteInventarioDTO;
import com.hotclick.dto.inventario.PaqueteLineaRequest;
import com.hotclick.model.CatalogoMaestro;
import com.hotclick.model.Empresa;
import com.hotclick.model.PaqueteInventario;
import com.hotclick.model.PaqueteLinea;
import com.hotclick.repository.CatalogoMaestroRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PaqueteInventarioRepository;
import com.hotclick.repository.PaqueteLineaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.ProductoService;
import com.hotclick.service.StockService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("InventarioPaqueteService — lookup y upsert barcode")
class InventarioPaqueteServiceTest {

    @Mock PaqueteInventarioRepository paqueteRepo;
    @Mock PaqueteLineaRepository lineaRepo;
    @Mock EmpresaRepository empresaRepo;
    @Mock UsuarioRepository usuarioRepo;
    @Mock ProductoRepository productoRepo;
    @Mock CatalogoMaestroRepository catalogoRepo;
    @Mock CategoriaRepository categoriaRepo;
    @Mock ProductoService productoService;
    @Mock StockService stockService;
    @Mock SupabaseStorageService storageService;
    @Mock InputSanitizer sanitizer;

    @InjectMocks InventarioPaqueteService service;

    private PaqueteInventario paquete;

    @BeforeEach
    void setUp() {
        paquete = new PaqueteInventario();
        paquete.setId(10L);
        paquete.setCodigo("PKG-AABBCCDD");
        paquete.setEstado(PaqueteInventario.ESTADO_ABIERTO);
        lenient().when(sanitizer.cleanWithLimit(any(), anyInt())).thenAnswer(inv -> {
            String v = inv.getArgument(0);
            return v == null ? null : v;
        });
    }

    @Test
    @DisplayName("lookup EN_PAQUETE cuando la línea ya existe")
    void lookup_enPaquete() {
        PaqueteLinea linea = new PaqueteLinea();
        linea.setId(5L);
        linea.setBarcode("750123");
        linea.setNombre("Cable USB");
        linea.setStock(3);
        linea.setPrecioVenta(2500);
        when(lineaRepo.findByPaqueteIdAndBarcode(10L, "750123")).thenReturn(Optional.of(linea));

        InventarioLookupDTO dto = service.lookup("750123", 10L);

        assertThat(dto.getMatch()).isEqualTo(InventarioLookupDTO.EN_PAQUETE);
        assertThat(dto.getLineaId()).isEqualTo(5L);
        assertThat(dto.getNombre()).isEqualTo("Cable USB");
        assertThat(dto.getStockActual()).isEqualTo(3);
    }

    @Test
    @DisplayName("lookup EN_MAESTRO cuando el catálogo tiene el barcode (sin precio/stock)")
    void lookup_enMaestro() {
        when(lineaRepo.findByPaqueteIdAndBarcode(10L, "890111")).thenReturn(Optional.empty());
        when(paqueteRepo.findById(10L)).thenReturn(Optional.of(paquete));
        CatalogoMaestro cm = new CatalogoMaestro();
        cm.setNombre("Mouse Logitech");
        cm.setImagenPrincipalUrl("https://img/m.jpg");
        cm.setCodigoBarras("890111");
        when(catalogoRepo.findByCodigoBarras("890111")).thenReturn(Optional.of(cm));

        InventarioLookupDTO dto = service.lookup("890111", 10L);

        assertThat(dto.getMatch()).isEqualTo(InventarioLookupDTO.EN_MAESTRO);
        assertThat(dto.getNombre()).isEqualTo("Mouse Logitech");
        assertThat(dto.getBarcode()).isEqualTo("890111");
        assertThat(dto.getPrecioVenta()).isNull();
        assertThat(dto.getStockActual()).isNull();
        assertThat(dto.getProductoId()).isNull();
    }

    @Test
    @DisplayName("mismo barcode dos veces en el paquete suma stock")
    void agregarLinea_mismoBarcode_sumaStock() {
        when(paqueteRepo.findById(10L)).thenReturn(Optional.of(paquete));
        PaqueteLinea existente = new PaqueteLinea();
        existente.setId(7L);
        existente.setBarcode("1111");
        existente.setNombre("Teclado");
        existente.setStock(2);
        when(lineaRepo.findByPaqueteIdAndBarcode(10L, "1111")).thenReturn(Optional.of(existente));
        when(lineaRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaqueteLineaRequest req = new PaqueteLineaRequest();
        req.setBarcode("1111");
        req.setNombre("Teclado");
        req.setStock(5);
        req.setPrecioVenta(1000);

        var dto = service.agregarLinea(10L, req);

        assertThat(dto.getStock()).isEqualTo(7);
        ArgumentCaptor<PaqueteLinea> cap = ArgumentCaptor.forClass(PaqueteLinea.class);
        verify(lineaRepo).save(cap.capture());
        assertThat(cap.getValue().getStock()).isEqualTo(7);
        assertThat(cap.getValue().getId()).isEqualTo(7L);
    }

    @Test
    @DisplayName("actualizarLinea ante unique violation lanza IllegalArgumentException")
    void actualizarLinea_uniqueViolation() {
        when(paqueteRepo.findById(10L)).thenReturn(Optional.of(paquete));
        PaqueteLinea linea = new PaqueteLinea();
        linea.setId(5L);
        linea.setBarcode("1111");
        when(lineaRepo.findByIdAndPaqueteId(5L, 10L)).thenReturn(Optional.of(linea));
        when(lineaRepo.findByPaqueteIdAndBarcode(10L, "2222")).thenReturn(Optional.empty());
        when(lineaRepo.save(any())).thenThrow(new DataIntegrityViolationException("unique paquete+barcode"));

        PaqueteLineaRequest req = new PaqueteLineaRequest();
        req.setBarcode("2222");
        req.setNombre("Producto");
        req.setPrecioVenta(1000);

        assertThatThrownBy(() -> service.actualizarLinea(10L, 5L, req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Ya existe otra línea con ese barcode");
    }

    @Test
    @DisplayName("actualizarLinea rechaza barcode duplicado en el paquete")
    void actualizarLinea_barcodeDuplicado() {
        when(paqueteRepo.findById(10L)).thenReturn(Optional.of(paquete));
        PaqueteLinea linea = new PaqueteLinea();
        linea.setId(5L);
        linea.setBarcode("1111");
        when(lineaRepo.findByIdAndPaqueteId(5L, 10L)).thenReturn(Optional.of(linea));
        PaqueteLinea otra = new PaqueteLinea();
        otra.setId(9L);
        otra.setBarcode("2222");
        when(lineaRepo.findByPaqueteIdAndBarcode(10L, "2222")).thenReturn(Optional.of(otra));

        PaqueteLineaRequest req = new PaqueteLineaRequest();
        req.setBarcode("2222");
        req.setNombre("Producto");
        req.setPrecioVenta(1000);

        assertThatThrownBy(() -> service.actualizarLinea(10L, 5L, req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("barcode");
        verify(lineaRepo, never()).save(any());
    }

    @Test
    @DisplayName("asignar rechaza paquete con líneas en CONFLICTO")
    void asignar_rechazaConflictos() {
        paquete.setEstado(PaqueteInventario.ESTADO_CERRADO);
        PaqueteLinea ok = new PaqueteLinea();
        ok.setEstado(PaqueteLinea.ESTADO_LISTO);
        PaqueteLinea conflicto = new PaqueteLinea();
        conflicto.setEstado(PaqueteLinea.ESTADO_CONFLICTO);
        paquete.setLineas(new ArrayList<>(List.of(ok, conflicto)));
        when(paqueteRepo.findByIdWithLineasForUpdate(10L)).thenReturn(Optional.of(paquete));

        assertThatThrownBy(() -> service.asignar(10L, 1L, "admin@test.com"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("1")
                .hasMessageContaining("CONFLICTO");
        verify(empresaRepo, never()).findById(anyLong());
    }

    @Test
    @DisplayName("asignar rechaza empresa distinta a la del paquete")
    void asignar_rechazaEmpresaDistinta() {
        paquete.setEstado(PaqueteInventario.ESTADO_CERRADO);
        Empresa empresa = new Empresa();
        empresa.setId(99L);
        paquete.setEmpresa(empresa);
        paquete.setLineas(List.of());
        when(paqueteRepo.findByIdWithLineasForUpdate(10L)).thenReturn(Optional.of(paquete));

        assertThatThrownBy(() -> service.asignar(10L, 1L, "admin@test.com"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("99");
        verify(empresaRepo, never()).findById(eq(1L));
    }

    @Test
    @DisplayName("asignar rechaza paquete sin líneas LISTO")
    void asignar_rechazaSinLineasListo() {
        paquete.setEstado(PaqueteInventario.ESTADO_CERRADO);
        paquete.setLineas(List.of());
        when(paqueteRepo.findByIdWithLineasForUpdate(10L)).thenReturn(Optional.of(paquete));

        assertThatThrownBy(() -> service.asignar(10L, 1L, "admin@test.com"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("El paquete no tiene líneas LISTO para asignar");
        verify(empresaRepo, never()).findById(anyLong());
    }

    @Test
    @DisplayName("reabrir CERRADO → ABIERTO y limpia fechaCierre")
    void reabrir_cerradoAbre() {
        paquete.setEstado(PaqueteInventario.ESTADO_CERRADO);
        paquete.setFechaCierre(LocalDateTime.of(2026, 9, 17, 10, 0));
        when(paqueteRepo.findById(10L)).thenReturn(Optional.of(paquete));
        when(paqueteRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(lineaRepo.countByPaqueteId(10L)).thenReturn(2L);

        PaqueteInventarioDTO dto = service.reabrir(10L);

        assertThat(dto.getEstado()).isEqualTo(PaqueteInventario.ESTADO_ABIERTO);
        assertThat(dto.getFechaCierre()).isNull();
        ArgumentCaptor<PaqueteInventario> cap = ArgumentCaptor.forClass(PaqueteInventario.class);
        verify(paqueteRepo).save(cap.capture());
        assertThat(cap.getValue().getEstado()).isEqualTo(PaqueteInventario.ESTADO_ABIERTO);
        assertThat(cap.getValue().getFechaCierre()).isNull();
    }

    @Test
    @DisplayName("agregarLinea ante unique violation suma stock existente")
    void agregarLinea_uniqueViolation_sumaStock() {
        when(paqueteRepo.findById(10L)).thenReturn(Optional.of(paquete));
        PaqueteLinea existente = new PaqueteLinea();
        existente.setId(8L);
        existente.setBarcode("4444");
        existente.setNombre("Mouse");
        existente.setStock(1);
        when(lineaRepo.findByPaqueteIdAndBarcode(10L, "4444"))
                .thenReturn(Optional.empty(), Optional.of(existente));
        when(lineaRepo.save(any()))
                .thenThrow(new DataIntegrityViolationException("unique paquete+barcode"))
                .thenAnswer(inv -> inv.getArgument(0));

        PaqueteLineaRequest req = new PaqueteLineaRequest();
        req.setBarcode("4444");
        req.setNombre("Mouse");
        req.setStock(4);
        req.setPrecioVenta(1500);

        var dto = service.agregarLinea(10L, req);

        assertThat(dto.getStock()).isEqualTo(5);
        assertThat(dto.getId()).isEqualTo(8L);
    }

    @Test
    @DisplayName("lookup rechaza barcode inválido")
    void lookup_rechazaBarcodeInvalido() {
        assertThatThrownBy(() -> service.lookup("12", 10L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("barcode inválido");
        verify(lineaRepo, never()).findByPaqueteIdAndBarcode(anyLong(), any());
    }

    @Test
    @DisplayName("lookup normaliza espacios en barcode")
    void lookup_normalizaEspacios() {
        PaqueteLinea linea = new PaqueteLinea();
        linea.setId(5L);
        linea.setBarcode("750123");
        linea.setNombre("Cable USB");
        when(lineaRepo.findByPaqueteIdAndBarcode(10L, "750123")).thenReturn(Optional.of(linea));

        InventarioLookupDTO dto = service.lookup("  750123  ", 10L);

        assertThat(dto.getMatch()).isEqualTo(InventarioLookupDTO.EN_PAQUETE);
        assertThat(dto.getLineaId()).isEqualTo(5L);
    }
}

package com.hotclick.service;

import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.dto.VentaRequestDTO;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.service.pos.PosVentaService;
import com.hotclick.service.producto.BodegaTenantGuard;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Seguridad #402 (BAJO): la bodega de otro negocio y la inexistente responden IGUAL (mismo status, mismo mensaje y sin
 * datos de la otra empresa) en la venta manual y en el POS; la bodega propia sigue funcionando.
 */
@DisplayName("Bodega ajena = bodega inexistente en VentaService y PosVentaService")
class BodegaOraculoVentaPosTest {

    private static final long MIA = 7L;
    private static final long OTRA = 8L;
    private static final long BODEGA_PROPIA = 70L;
    private static final long BODEGA_AJENA = 80L;

    private BodegaRepository bodegas;
    private VentaService venta;
    private PosVentaService pos;

    private static Bodega bodega(long id, long empresaId, String nombre) {
        Bodega b = new Bodega();
        b.setId(id);
        b.setNombreBodega(nombre);
        Empresa e = new Empresa();
        e.setId(empresaId);
        b.setEmpresa(e);
        return b;
    }

    @BeforeEach
    void preparar() {
        bodegas = mock(BodegaRepository.class);
        when(bodegas.findById(BODEGA_PROPIA)).thenReturn(Optional.of(bodega(BODEGA_PROPIA, MIA, "Bodega propia")));
        when(bodegas.findById(BODEGA_AJENA)).thenReturn(Optional.of(bodega(BODEGA_AJENA, OTRA, "Secreta de la otra")));
        when(bodegas.findById(999L)).thenReturn(Optional.empty());
        when(bodegas.findById(81L)).thenReturn(Optional.empty());
        BodegaTenantGuard guard = new BodegaTenantGuard(bodegas);
        venta = new VentaService();
        ReflectionTestUtils.setField(venta, "bodegaRepository", bodegas);
        ReflectionTestUtils.setField(venta, "bodegaTenantGuard", guard);
        pos = new PosVentaService();
        ReflectionTestUtils.setField(pos, "bodegaRepository", bodegas);
        ReflectionTestUtils.setField(pos, "bodegaTenantGuard", guard);
    }

    private Throwable ventaResuelve(long bodegaId) {
        VentaRequestDTO dto = new VentaRequestDTO();
        dto.setBodegaId(bodegaId);
        return catchThrowable(() -> ReflectionTestUtils.invokeMethod(venta, "resolverBodega", dto, MIA));
    }

    private Throwable posResuelve(long bodegaId) {
        return catchThrowable(() -> ReflectionTestUtils.invokeMethod(pos, "resolverBodega", bodegaId, MIA));
    }

    private static ResponseEntity<ResponseDTO> respuesta(Throwable t) {
        assertThat(t).isInstanceOf(java.util.NoSuchElementException.class);
        return new GlobalExceptionHandler().handleNotFound((java.util.NoSuchElementException) t);
    }

    @Test
    @DisplayName("venta manual: ajena e inexistente → misma excepción, mismo status y cuerpo, sin datos de la otra empresa")
    void ventaAjenaIgualQueInexistente() {
        Throwable ajena = ventaResuelve(BODEGA_AJENA);
        Throwable inexistente = ventaResuelve(81L); // mismo formato de id, no existe
        assertThat(ajena.getClass()).isEqualTo(inexistente.getClass());
        ResponseEntity<ResponseDTO> a = respuesta(ajena);
        ResponseEntity<ResponseDTO> i = respuesta(inexistente);
        assertThat(a.getStatusCode()).isEqualTo(i.getStatusCode());
        assertThat(a.getStatusCode().value()).isEqualTo(404);
        // el mensaje solo difiere en el id que el propio cliente envió (no hay texto distinto "no pertenece a tu empresa")
        assertThat(ajena.getMessage()).isEqualTo("Bodega no encontrado: " + BODEGA_AJENA);
        assertThat(inexistente.getMessage()).isEqualTo("Bodega no encontrado: 81");
        assertThat(ajena.getMessage().replace("80", "N")).isEqualTo(inexistente.getMessage().replace("81", "N"));
        assertThat(String.valueOf(a.getBody())).doesNotContain("Secreta", "empresa", "pertenece");
    }

    @Test
    @DisplayName("POS: ajena e inexistente → misma excepción, mismo status y cuerpo, sin datos de la otra empresa")
    void posAjenaIgualQueInexistente() {
        Throwable ajena = posResuelve(BODEGA_AJENA);
        Throwable inexistente = posResuelve(81L);
        assertThat(ajena.getClass()).isEqualTo(inexistente.getClass());
        ResponseEntity<ResponseDTO> a = respuesta(ajena);
        ResponseEntity<ResponseDTO> i = respuesta(inexistente);
        assertThat(a.getStatusCode()).isEqualTo(i.getStatusCode());
        assertThat(a.getStatusCode().value()).isEqualTo(404);
        assertThat(ajena.getMessage().replace("80", "N")).isEqualTo(inexistente.getMessage().replace("81", "N"));
        assertThat(String.valueOf(a.getBody())).doesNotContain("Secreta", "empresa", "pertenece");
    }

    @Test
    @DisplayName("la misma respuesta en ambos servicios: venta manual y POS no se distinguen entre sí")
    void ventaYPosRespondenIgual() {
        assertThat(ventaResuelve(BODEGA_AJENA).getMessage()).isEqualTo(posResuelve(BODEGA_AJENA).getMessage());
        assertThat(ventaResuelve(999L).getMessage()).isEqualTo(posResuelve(999L).getMessage());
        assertThat(respuesta(ventaResuelve(BODEGA_AJENA)).getBody())
            .usingRecursiveComparison().ignoringFields("timestamp").isEqualTo(respuesta(posResuelve(BODEGA_AJENA)).getBody());
    }

    @Test
    @DisplayName("la bodega propia sigue funcionando en venta manual y POS")
    void bodegaPropiaFunciona() {
        VentaRequestDTO dto = new VentaRequestDTO();
        dto.setBodegaId(BODEGA_PROPIA);
        Bodega v = ReflectionTestUtils.invokeMethod(venta, "resolverBodega", dto, MIA);
        Bodega p = ReflectionTestUtils.invokeMethod(pos, "resolverBodega", BODEGA_PROPIA, MIA);
        assertThat(v.getId()).isEqualTo(BODEGA_PROPIA);
        assertThat(p.getId()).isEqualTo(BODEGA_PROPIA);
    }

    @Test
    @DisplayName("sin bodegaId, ambos servicios usan la primera bodega activa del propio negocio")
    void bodegaPorDefectoDelNegocio() {
        Bodega propia = bodega(BODEGA_PROPIA, MIA, "Bodega propia");
        when(bodegas.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(MIA, Constants.ESTADO_ACTIVO)).thenReturn(List.of(propia));
        when(bodegas.findByEmpresaIdAndEstado(MIA, Constants.ESTADO_ACTIVO)).thenReturn(List.of(propia));
        Bodega v = ReflectionTestUtils.invokeMethod(venta, "resolverBodega", new VentaRequestDTO(), MIA);
        Bodega p = ReflectionTestUtils.invokeMethod(pos, "resolverBodega", (Long) null, MIA);
        assertThat(v.getId()).isEqualTo(BODEGA_PROPIA);
        assertThat(p.getId()).isEqualTo(BODEGA_PROPIA);
    }
}

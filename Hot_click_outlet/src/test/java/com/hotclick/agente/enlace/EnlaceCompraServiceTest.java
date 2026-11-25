package com.hotclick.agente.enlace;

import com.hotclick.agente.enlace.EnlaceCompraService.EnlaceCreado;
import com.hotclick.agente.enlace.EnlaceCompraService.ItemSolicitado;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.payment.GuestCheckoutGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static com.hotclick.agente.enlace.EnlaceTestSupport.empresa;
import static com.hotclick.agente.enlace.EnlaceTestSupport.producto;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EnlaceCompraServiceTest {

    private static final LocalDateTime AHORA = LocalDateTime.of(2026, 12, 7, 10, 0);
    private static final java.util.UUID SESION = java.util.UUID.fromString("11111111-2222-3333-4444-555555555555");

    private EnlaceCompraRepository repo;
    private ProductoRepository productos;
    private EnlaceCompraService service;
    private EnlaceCompraTope tope;
    private Empresa tienda;

    @BeforeEach
    void setUp() {
        repo = mock(EnlaceCompraRepository.class);
        productos = mock(ProductoRepository.class);
        GuestCheckoutGuard guard = mock(GuestCheckoutGuard.class);
        when(guard.getMaxPorProducto()).thenReturn(3);
        when(guard.getMaxPendientes()).thenReturn(6);
        tope = mock(EnlaceCompraTope.class);
        service = new EnlaceCompraService(repo, productos, guard, tope, "https://hotclick.lat/", 24);
        service.reloj = () -> AHORA;
        tienda = empresa(7);
    }

    private void existen(Producto... ps) {
        when(productos.findAllById(any())).thenReturn(List.of(ps));
    }

    @Test
    void crea_calculaTotalEnColones_urlYResumen() {
        Producto leche = producto(11, tienda, 1500, 10);
        existen(leche);

        EnlaceCreado r = service.crear(7L, SESION, "50600000000", "Ana", "whatsapp", List.of(new ItemSolicitado(11L, 3)));

        assertThat(r.total()).isEqualTo(4500);
        assertThat(r.url()).isEqualTo("https://hotclick.lat/c/" + r.codigo());
        assertThat(r.codigo()).hasSizeGreaterThanOrEqualTo(22);
        assertThat(r.vence()).isEqualTo(AHORA.plusHours(24));
        assertThat(r.resumenChat()).contains("3 × Leche deslactosada 1 L 11 = ₡").contains("4").contains("Total: ₡");
        ArgumentCaptor<EnlaceCompra> cap = ArgumentCaptor.forClass(EnlaceCompra.class);
        verify(repo).save(cap.capture());
        assertThat(cap.getValue().getEstado()).isEqualTo(EnlaceCompraEstado.CREADO);
        assertThat(cap.getValue().getCanal()).isEqualTo("WHATSAPP");
        assertThat(cap.getValue().getChatSesionId()).isEqualTo(SESION);
        assertThat(cap.getValue().getItems()).hasSize(1);
        assertThat(cap.getValue().getItems().get(0).getPrecioUnitarioCreado()).isEqualTo(1500);
    }

    @Test
    void crea_aplicaElTopeDeEnlacesVigentesAntesDeGuardar() {
        existen(producto(11, tienda, 1500, 10));
        service.crear(7L, SESION, "  50600000000  ", "Ana", "whatsapp", List.of(new ItemSolicitado(11L, 1)));
        org.mockito.InOrder orden = org.mockito.Mockito.inOrder(tope, repo);
        orden.verify(tope).hacerEspacio(7L, SESION, "WHATSAPP", "50600000000", AHORA);
        orden.verify(repo).save(any());
    }

    @Test
    void creado_toStringNoLlevaElCodigoNiLaUrl() {
        existen(producto(11, tienda, 1500, 10));
        EnlaceCreado r = service.crear(7L, SESION, "50600000000", "Ana", "WHATSAPP", List.of(new ItemSolicitado(11L, 1)));
        assertThat(r.toString()).doesNotContain(r.codigo()).doesNotContain("/c/").doesNotContain("Leche");
    }

    @Test
    void productoDeOtraTienda_seRechazaConMensajeNeutro() {
        existen(producto(11, empresa(8), 1500, 10));
        assertThatThrownBy(() -> service.crear(7L, null, "x", "Ana", "WHATSAPP", List.of(new ItemSolicitado(11L, 1))))
            .isInstanceOf(EnlaceCompraException.class).hasMessageContaining("no está disponible");
        verify(repo, never()).save(any());
    }

    @Test
    void marketplace_aceptaProductosDeVariasTiendas() {
        existen(producto(11, tienda, 1000, 5), producto(12, empresa(8), 2000, 5));
        EnlaceCreado r = service.crear(null, null, "x", "Ana", "WHATSAPP",
            List.of(new ItemSolicitado(11L, 1), new ItemSolicitado(12L, 2)));
        assertThat(r.total()).isEqualTo(5000);
    }

    @Test
    void productoOcultoOSinVisibilidad_seRechaza() {
        Producto oculto = producto(11, tienda, 1500, 10);
        oculto.setVisibleCatalogo(false);
        existen(oculto);
        assertThatThrownBy(() -> service.crear(null, null, "x", "Ana", "WHATSAPP", List.of(new ItemSolicitado(11L, 1))))
            .isInstanceOf(EnlaceCompraException.class);

        Producto empresaOculta = producto(12, empresa(9), 1500, 10);
        empresaOculta.getEmpresa().setVisibilidadPublica(false);
        existen(empresaOculta);
        assertThatThrownBy(() -> service.crear(null, null, "x", "Ana", "WHATSAPP", List.of(new ItemSolicitado(12L, 1))))
            .isInstanceOf(EnlaceCompraException.class);
    }

    @Test
    void productoInexistente_seRechaza() {
        when(productos.findAllById(any())).thenReturn(List.of());
        assertThatThrownBy(() -> service.crear(null, null, "x", "Ana", "WHATSAPP", List.of(new ItemSolicitado(1L, 1))))
            .isInstanceOf(EnlaceCompraException.class);
    }

    @Test
    void cantidadSobreElTopeDelCheckoutDeInvitado_seRechaza() {
        existen(producto(11, tienda, 1500, 50));
        assertThatThrownBy(() -> service.crear(7L, null, "x", "Ana", "WHATSAPP", List.of(new ItemSolicitado(11L, 4))))
            .isInstanceOf(EnlaceCompraException.class).hasMessageContaining("3");
        // El mismo producto repetido suma antes de comparar con el tope.
        assertThatThrownBy(() -> service.crear(7L, null, "x", "Ana", "WHATSAPP",
            List.of(new ItemSolicitado(11L, 2), new ItemSolicitado(11L, 2))))
            .isInstanceOf(EnlaceCompraException.class);
    }

    @Test
    void totalDeUnidadesSobreElCupoPendiente_seRechaza() {
        existen(producto(11, tienda, 1, 50), producto(12, tienda, 1, 50), producto(13, tienda, 1, 50));
        assertThatThrownBy(() -> service.crear(7L, null, "x", "Ana", "WHATSAPP",
            List.of(new ItemSolicitado(11L, 3), new ItemSolicitado(12L, 3), new ItemSolicitado(13L, 1))))
            .isInstanceOf(EnlaceCompraException.class).hasMessageContaining("6");
    }

    @Test
    void stockInsuficiente_seRechazaConLasUnidadesQueQuedan() {
        existen(producto(11, tienda, 1500, 2));
        assertThatThrownBy(() -> service.crear(7L, null, "x", "Ana", "WHATSAPP", List.of(new ItemSolicitado(11L, 3))))
            .isInstanceOf(EnlaceCompraException.class).hasMessageContaining("2");
    }

    @Test
    void entradaInvalida_seRechaza() {
        assertThatThrownBy(() -> service.crear(7L, null, "x", "Ana", "WHATSAPP", List.of()))
            .isInstanceOf(EnlaceCompraException.class);
        assertThatThrownBy(() -> service.crear(7L, null, "x", "Ana", "WHATSAPP", List.of(new ItemSolicitado(1L, 0))))
            .isInstanceOf(EnlaceCompraException.class);
        assertThatThrownBy(() -> service.crear(7L, null, "x", "Ana", "FAX", List.of(new ItemSolicitado(1L, 1))))
            .isInstanceOf(EnlaceCompraException.class);
    }

    @Test
    void codigos_sonAleatoriosUnicosYConFormatoValido() {
        Set<String> vistos = new HashSet<>();
        for (int i = 0; i < 2000; i++) {
            String c = CodigoEnlace.generar();
            assertThat(c).hasSizeGreaterThanOrEqualTo(22).matches("[A-Za-z0-9_-]+");
            assertThat(CodigoEnlace.formatoValido(c)).isTrue();
            assertThat(vistos.add(c)).isTrue();
        }
    }

    @Test
    void formato_rechazaBasuraYCodigosCortos() {
        assertThat(CodigoEnlace.formatoValido(null)).isFalse();
        assertThat(CodigoEnlace.formatoValido("")).isFalse();
        assertThat(CodigoEnlace.formatoValido("123")).isFalse();
        assertThat(CodigoEnlace.formatoValido("../../etc/passwd../../../../")).isFalse();
        assertThat(CodigoEnlace.formatoValido("a'; DROP TABLE x;--aaaaaaaaaa")).isFalse();
        assertThat(CodigoEnlace.formatoValido("a".repeat(65))).isFalse();
    }
}

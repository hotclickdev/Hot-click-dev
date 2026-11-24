package com.hotclick.agente.enlace;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static com.hotclick.agente.enlace.EnlaceTestSupport.empresa;
import static com.hotclick.agente.enlace.EnlaceTestSupport.enlace;
import static com.hotclick.agente.enlace.EnlaceTestSupport.producto;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** AG-07 (apertura, vínculo, ganchos de estado) y AG-09 (reserva 30 min, precio recalculado, vencimiento). */
class EnlaceCompraAperturaTest {

    private static final LocalDateTime AHORA = LocalDateTime.of(2026, 12, 7, 10, 0);
    private static final String CODIGO = "AbCdEfGhIjKlMnOpQrStUv_-";
    private static final String CONTACTO = "50600000000";

    private EnlaceCompraRepository repo;
    private ProductoRepository productos;
    private EnlaceCompraReserva reserva;
    private EnlaceCompraAperturaService apertura;
    private Empresa tienda;
    private Producto leche;
    private EnlaceCompra enlace;

    @BeforeEach
    void setUp() throws Exception {
        repo = mock(EnlaceCompraRepository.class);
        productos = mock(ProductoRepository.class);
        reserva = new EnlaceCompraReserva(productos, repo);
        apertura = new EnlaceCompraAperturaService(repo, reserva, 30);
        apertura.reloj = () -> AHORA;
        tienda = empresa(7);
        leche = producto(11, tienda, 1500, 10);
        enlace = enlace(CODIGO, 7L, "WHATSAPP", CONTACTO, leche, 3, 1500, AHORA.minusHours(1));
        var campo = EnlaceCompra.class.getDeclaredField("id");
        campo.setAccessible(true);
        campo.set(enlace, 42L);
        when(repo.findByCodigoForUpdate(CODIGO)).thenReturn(Optional.of(enlace));
        when(repo.findByIdForUpdate(any())).thenReturn(Optional.of(enlace));
        when(productos.findAllByIdsForUpdate(any())).thenReturn(List.of(leche));
    }

    @Test
    void abrir_reservaElStock30MinutosYMarcaAbierto() {
        EnlaceAbiertoDto dto = apertura.abrir(CODIGO).orElseThrow();

        assertThat(leche.getStockReservado()).isEqualTo(3);
        assertThat(enlace.getReservaHasta()).isEqualTo(AHORA.plusMinutes(30));
        assertThat(enlace.getEstado()).isEqualTo(EnlaceCompraEstado.ABIERTO);
        assertThat(enlace.getAbierto()).isEqualTo(AHORA);
        assertThat(dto.items()).hasSize(1);
        assertThat(dto.items().get(0).cantidad()).isEqualTo(3);
        assertThat(dto.totalActual()).isEqualTo(4500);
        assertThat(dto.precioCambio()).isFalse();
        assertThat(dto.stockCambio()).isFalse();
    }

    @Test
    void abrir_recalculaElPrecioYAvisaSiCambio() {
        leche.setPrecioVenta(1800);
        EnlaceAbiertoDto dto = apertura.abrir(CODIGO).orElseThrow();

        assertThat(dto.precioCambio()).isTrue();
        assertThat(dto.totalCreado()).isEqualTo(4500);
        assertThat(dto.totalActual()).isEqualTo(5400);
        assertThat(dto.items().get(0).precioUnitario()).isEqualTo(1800);
        assertThat(dto.items().get(0).precioCreado()).isEqualTo(1500);
    }

    @Test
    void abrir_conMenosStockReservaLoQueHayYAvisa() {
        leche.setStockActual(2);
        EnlaceAbiertoDto dto = apertura.abrir(CODIGO).orElseThrow();

        assertThat(dto.stockCambio()).isTrue();
        assertThat(dto.items().get(0).cantidad()).isEqualTo(2);
        assertThat(dto.items().get(0).cantidadSolicitada()).isEqualTo(3);
        assertThat(leche.getStockReservado()).isEqualTo(2);
    }

    @Test
    void abrir_sinStockNoReservaNada() {
        leche.setStockActual(0);
        EnlaceAbiertoDto dto = apertura.abrir(CODIGO).orElseThrow();

        assertThat(dto.items().get(0).disponible()).isFalse();
        assertThat(leche.getStockReservado()).isZero();
        assertThat(enlace.getReservaHasta()).isNull();
    }

    @Test
    void abrirDosVeces_renuevaLaReservaSinDuplicarla() {
        apertura.abrir(CODIGO);
        apertura.reloj = () -> AHORA.plusMinutes(10);
        apertura.abrir(CODIGO);

        assertThat(leche.getStockReservado()).isEqualTo(3);
        assertThat(enlace.getReservaHasta()).isEqualTo(AHORA.plusMinutes(40));
    }

    @Test
    void abrir_productoQueYaNoEsVisibleSeMarcaNoDisponible() {
        leche.setVisibleCatalogo(false);
        EnlaceAbiertoDto dto = apertura.abrir(CODIGO).orElseThrow();

        assertThat(dto.items().get(0).disponible()).isFalse();
        assertThat(dto.stockCambio()).isTrue();
        assertThat(leche.getStockReservado()).isZero();
    }

    @Test
    void abrir_nuncaExponeDatosInternosNiElTelefonoCompleto() {
        EnlaceAbiertoDto dto = apertura.abrir(CODIGO).orElseThrow();

        assertThat(dto.telefonoMascara()).isEqualTo("****0000");
        assertThat(dto.nombreCliente()).isEqualTo("Cliente Prueba");
        String plano = dto.toString();
        assertThat(plano).doesNotContain(CONTACTO).doesNotContain("WHATSAPP").doesNotContain(CODIGO);
    }

    @Test
    void abrir_codigosInvalidosVencidosOUsados_dan_empty_sinDistinguir() {
        assertThat(apertura.abrir(null)).isEmpty();
        assertThat(apertura.abrir("corto")).isEmpty();
        assertThat(apertura.abrir("A".repeat(30))).isEmpty(); // formato válido pero inexistente

        enlace.setVence(AHORA.minusSeconds(1));
        assertThat(apertura.abrir(CODIGO)).isEmpty();

        enlace.setVence(AHORA.plusHours(1));
        for (EnlaceCompraEstado e : List.of(EnlaceCompraEstado.PAGADO, EnlaceCompraEstado.VENCIDO, EnlaceCompraEstado.CANCELADO)) {
            enlace.setEstado(e);
            assertThat(apertura.abrir(CODIGO)).as(e.name()).isEmpty();
        }
        assertThat(leche.getStockReservado()).isZero();
    }

    @Test
    void abrir_tras_pagoRechazado_dejaReintentar() {
        enlace.setEstado(EnlaceCompraEstado.RECHAZADO);
        assertThat(apertura.abrir(CODIGO)).isPresent();
        assertThat(enlace.getEstado()).isEqualTo(EnlaceCompraEstado.ABIERTO);
    }

    // ---- vínculo con el checkout ----

    @Test
    void checkout_liberaLaReservaDelEnlace_vinculaPedido_yCompletaTelefono() {
        apertura.abrir(CODIGO);
        EnlaceCompraVinculo vinculo = new EnlaceCompraVinculo(repo, reserva);
        vinculo.reloj = () -> AHORA.plusMinutes(5);
        when(repo.findById(any())).thenReturn(Optional.of(enlace));
        PaymentCheckoutRequest req = new PaymentCheckoutRequest();
        req.setEnlaceCodigo(CODIGO);

        Optional<Long> id = vinculo.preparar(req);

        assertThat(leche.getStockReservado()).isZero();
        assertThat(enlace.getReservaHasta()).isNull();
        assertThat(req.getGuestPhone()).isEqualTo("00000000");

        Pedido pedido = new Pedido();
        vinculo.vincular(id.orElseThrow(), List.of(pedido));
        assertThat(pedido.getOrigenCanal()).isEqualTo("WHATSAPP");
    }

    @Test
    void checkout_vinculaPedidoConElEnlaceYAtribuyeElCanal() throws Exception {
        when(repo.findById(42L)).thenReturn(Optional.of(enlace));
        EnlaceCompraVinculo vinculo = new EnlaceCompraVinculo(repo, reserva);
        Pedido pedido = new Pedido();
        pedido.setId(500L);

        vinculo.vincular(42L, List.of(pedido));

        assertThat(pedido.getOrigenCanal()).isEqualTo("WHATSAPP");
        assertThat(pedido.getEnlaceCompraId()).isEqualTo(42L);
        assertThat(enlace.getPedidoId()).isEqualTo(500L);
        assertThat(enlace.getEstado()).isNotEqualTo(EnlaceCompraEstado.PAGADO); // AG-08 confirma el pago
    }

    @Test
    void checkout_conCodigoInvalidoNoBloqueaLaCompra() {
        EnlaceCompraVinculo vinculo = new EnlaceCompraVinculo(repo, reserva);
        PaymentCheckoutRequest req = new PaymentCheckoutRequest();
        assertThat(vinculo.preparar(req)).isEmpty();
        req.setEnlaceCodigo("no-es-un-codigo");
        assertThat(vinculo.preparar(req)).isEmpty();
        req.setEnlaceCodigo("B".repeat(30));
        assertThat(vinculo.preparar(req)).isEmpty();
    }

    @Test
    void checkout_noCompletaTelefonoSiElCompradorYaLoEscribio() {
        EnlaceCompraVinculo vinculo = new EnlaceCompraVinculo(repo, reserva);
        vinculo.reloj = () -> AHORA;
        PaymentCheckoutRequest req = new PaymentCheckoutRequest();
        req.setEnlaceCodigo(CODIGO);
        req.setGuestPhone("88880000");
        vinculo.preparar(req);
        assertThat(req.getGuestPhone()).isEqualTo("88880000");
    }

    // ---- vencimiento / ganchos AG-08 ----

    @Test
    void barrido_venceElEnlaceA24HYLiberaLaReserva() {
        apertura.abrir(CODIGO);
        assertThat(leche.getStockReservado()).isEqualTo(3);

        boolean cambio = reserva.liberarYVencer(1L, true, enlace.getVence().plusMinutes(1));

        assertThat(cambio).isTrue();
        assertThat(enlace.getEstado()).isEqualTo(EnlaceCompraEstado.VENCIDO);
        assertThat(leche.getStockReservado()).isZero();
        assertThat(enlace.getReservaHasta()).isNull();
    }

    @Test
    void barrido_reservaDe30MinCumplida_liberaSinVencerElEnlace() {
        apertura.abrir(CODIGO);

        reserva.liberarYVencer(1L, false, AHORA.plusMinutes(31));

        assertThat(leche.getStockReservado()).isZero();
        assertThat(enlace.getEstado()).isEqualTo(EnlaceCompraEstado.ABIERTO);
        // y si sigue vigente a los 10 min no toca nada
        apertura.abrir(CODIGO);
        assertThat(reserva.liberarYVencer(1L, false, AHORA.plusMinutes(10))).isFalse();
        assertThat(leche.getStockReservado()).isEqualTo(3);
    }

    @Test
    void barrido_noVenceUnEnlaceConPedidoEnCurso() {
        enlace.setPedidoId(9L);
        enlace.setEstado(EnlaceCompraEstado.ABIERTO);
        assertThat(reserva.liberarYVencer(1L, true, enlace.getVence().plusHours(1))).isFalse();
        assertThat(enlace.getEstado()).isEqualTo(EnlaceCompraEstado.ABIERTO);
    }

    @Test
    void barrido_vacioNoHaceNada_yUnFalloNoFrenaLosDemas() {
        EnlaceCompraVencimientoScheduler s = new EnlaceCompraVencimientoScheduler(repo, reserva);
        when(repo.idsConReservaVencida(any())).thenReturn(List.of(1L, 2L));
        when(repo.idsParaVencer(any())).thenReturn(List.of());
        when(repo.findByIdForUpdate(2L)).thenThrow(new IllegalStateException("bd"));
        apertura.abrir(CODIGO);
        assertThat(s.barrer(AHORA.plusMinutes(31))).isEqualTo(1);
    }

    @Test
    void ganchosAg08_pagadoLiberaYEsTerminal_rechazadoReabre() {
        EnlaceCompraEstadoService estados = new EnlaceCompraEstadoService(repo, reserva);
        enlace.setPedidoId(9L);
        when(repo.findByPedidoIdForUpdate(9L)).thenReturn(List.of(enlace));

        estados.marcarRechazadoPorPedido(9L);
        assertThat(enlace.getEstado()).isEqualTo(EnlaceCompraEstado.RECHAZADO);
        assertThat(enlace.estaVigente(AHORA)).isTrue();

        estados.marcarPagadoPorPedido(9L);
        assertThat(enlace.getEstado()).isEqualTo(EnlaceCompraEstado.PAGADO);
        estados.marcarRechazadoPorPedido(9L);
        assertThat(enlace.getEstado()).isEqualTo(EnlaceCompraEstado.PAGADO);

        assertThat(estados.registrarRecordatorio(1L)).isEqualTo(1);
    }
}

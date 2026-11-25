package com.hotclick.agente.metricas;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaRepository;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import com.hotclick.agente.enlace.EnlaceCompra;
import com.hotclick.agente.enlace.EnlaceCompraEstado;
import com.hotclick.agente.enlace.EnlaceCompraRepository;
import com.hotclick.agente.metricas.ResenaBotService.Resultado;
import com.hotclick.agente.seguimiento.ListaBajasAgente;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static com.hotclick.agente.pago.PagoBotTestSupport.CONTACTO;
import static com.hotclick.agente.pago.PagoBotTestSupport.cuenta;
import static com.hotclick.agente.pago.PagoBotTestSupport.enlace;
import static com.hotclick.agente.pago.PagoBotTestSupport.proveedor;
import static com.hotclick.agente.pago.PagoBotTestSupport.sesion;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** AG-35: reseña en el mismo chat al entregar. Una vez por pedido, solo dentro de las 24 h y respetando las bajas. */
class ResenaBotServiceTest {

    private static final Instant AHORA = Instant.parse("2026-12-10T18:00:00Z");

    private PedidoRepository pedidos;
    private EnlaceCompraRepository enlaces;
    private ConversacionSesionRepository sesiones;
    private CanalCuentaRepository cuentas;
    private ConversacionService conversaciones;
    private CanalMensajeria canal;
    private ResenaAvisoRepositorio avisos;
    private ListaBajasAgente bajas;
    private ResenaBotService servicio;

    private UUID sesionId;
    private ConversacionSesion sesion;
    private CanalCuenta cuenta;
    private final PedidoBotEntregadoEvent ev = new PedidoBotEntregadoEvent(100L, 42L);

    @BeforeEach
    void init() {
        pedidos = mock(PedidoRepository.class);
        enlaces = mock(EnlaceCompraRepository.class);
        sesiones = mock(ConversacionSesionRepository.class);
        cuentas = mock(CanalCuentaRepository.class);
        conversaciones = mock(ConversacionService.class);
        canal = mock(CanalMensajeria.class);
        avisos = mock(ResenaAvisoRepositorio.class);
        bajas = mock(ListaBajasAgente.class);
        servicio = new ResenaBotService(pedidos, enlaces, sesiones, cuentas, conversaciones, canal, avisos,
            proveedor(bajas), "https://hotclick.example/", Clock.fixed(AHORA, ZoneOffset.UTC));

        sesionId = UUID.randomUUID();
        sesion = sesion(sesionId, AHORA.minusSeconds(3600));
        cuenta = cuenta(EstadoCanal.ACTIVA);
        Pedido pedido = new Pedido();
        pedido.setId(100L);
        pedido.setNumeroPedido("HC-0100");
        pedido.setEnlaceCompraId(42L);
        EnlaceCompra e = enlace(42L, EnlaceCompraEstado.PAGADO, sesionId, java.time.LocalDateTime.of(2026, 12, 7, 10, 0));

        when(pedidos.findById(100L)).thenReturn(Optional.of(pedido));
        when(enlaces.findById(42L)).thenReturn(Optional.of(e));
        when(sesiones.findById(sesionId)).thenReturn(Optional.of(sesion));
        when(cuentas.findById(5L)).thenReturn(Optional.of(cuenta));
        when(bajas.dadosDeBaja(any())).thenReturn(Set.of());
        when(avisos.reclamar(100L, 7L)).thenReturn(true);
    }

    @Test
    void dentroDeLaVentanaPideLaResenaEnElMismoChatConElEnlaceDeOpiniones() {
        assertThat(servicio.alEntregar(ev)).isEqualTo(Resultado.ENVIADA);

        ArgumentCaptor<String> texto = ArgumentCaptor.forClass(String.class);
        verify(canal).enviarTexto(eq(cuenta), eq(CONTACTO), texto.capture());
        assertThat(texto.getValue()).contains("HC-0100").contains("https://hotclick.example/perfil?vista=opiniones");
        verify(conversaciones).registrarSalienteBot(sesionId, 7L, texto.getValue());
    }

    @Test
    void unaSolaVezPorPedido() {
        when(avisos.reclamar(100L, 7L)).thenReturn(false);

        assertThat(servicio.alEntregar(ev)).isEqualTo(Resultado.YA_ENVIADA);
        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
    }

    @Test
    void fueraDeLaVentanaNoMandaNadaNiReclama() {
        sesion.setUltimoMensajeCliente(AHORA.minusSeconds(24 * 3600 + 1));

        assertThat(servicio.alEntregar(ev)).isEqualTo(Resultado.FUERA_DE_VENTANA);
        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
        verify(avisos, never()).reclamar(any(), any());
    }

    @Test
    void siElClienteSeDioDeBajaNoSeLeEscribe() {
        when(bajas.dadosDeBaja(any())).thenReturn(Set.of(new ListaBajasAgente.Contacto(7L, "WHATSAPP", CONTACTO)));

        assertThat(servicio.alEntregar(ev)).isEqualTo(Resultado.EN_BAJA);
        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
        verify(avisos, never()).reclamar(any(), any());
    }

    @Test
    void conversacionDeOtroNegocioNoSeUsa() {
        sesion.setEmpresaId(8L);

        assertThat(servicio.alEntregar(ev)).isEqualTo(Resultado.SIN_CONVERSACION);
        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
    }

    @Test
    void enlaceQueNoEsDelPedidoNoSeUsa() {
        Pedido otro = new Pedido();
        otro.setId(100L);
        otro.setEnlaceCompraId(99L);
        when(pedidos.findById(100L)).thenReturn(Optional.of(otro));

        assertThat(servicio.alEntregar(ev)).isEqualTo(Resultado.SIN_CONVERSACION);
    }

    @Test
    void canalPausadoNoEnvia() {
        cuenta.setEstado(EstadoCanal.PAUSADA);

        assertThat(servicio.alEntregar(ev)).isEqualTo(Resultado.CANAL_NO_DISPONIBLE);
        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
    }

    @Test
    void siMetaFallaSeLiberaLaReclamacionParaReintentar() {
        doThrow(new IllegalStateException("meta caída")).when(canal).enviarTexto(any(), anyString(), anyString());

        assertThat(servicio.alEntregar(ev)).isEqualTo(Resultado.ERROR);
        verify(avisos).liberar(100L);
        verify(conversaciones, never()).registrarSalienteBot(any(), any(), anyString());
    }

    @Test
    void pedidoOEnlaceInexistenteNoHaceNada() {
        assertThat(servicio.alEntregar(new PedidoBotEntregadoEvent(null, null))).isEqualTo(Resultado.SIN_CONVERSACION);
        assertThat(servicio.alEntregar(new PedidoBotEntregadoEvent(5L, 6L))).isEqualTo(Resultado.SIN_CONVERSACION);
    }
}

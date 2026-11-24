package com.hotclick.agente.conversacion;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conversacion.spi.AgenteRespondedor;
import com.hotclick.agente.conversacion.spi.TelefonoVinculadoResolver;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import com.hotclick.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EnrutadorConversacionesTest {

    private static final Instant T0 = Instant.parse("2026-12-01T10:00:00Z");

    private CanalCuentaService cuentas;
    private ConversacionSesionRepository sesiones;
    private ConversacionMensajeRepository mensajes;
    private ObjectProvider<TelefonoVinculadoResolver> resolverProvider;
    private ObjectProvider<AgenteRespondedor> respondedorProvider;
    private AgenteRespondedor respondedor;
    private final List<ConversacionSesion> guardadas = new ArrayList<>();
    private final List<ConversacionMensaje> msgs = new ArrayList<>();
    private EnrutadorConversaciones enrutador;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void init() {
        cuentas = mock(CanalCuentaService.class);
        sesiones = mock(ConversacionSesionRepository.class);
        mensajes = mock(ConversacionMensajeRepository.class);
        resolverProvider = mock(ObjectProvider.class);
        respondedorProvider = mock(ObjectProvider.class);
        respondedor = mock(AgenteRespondedor.class);
        when(respondedorProvider.getIfAvailable()).thenReturn(respondedor);

        when(sesiones.save(any())).thenAnswer(i -> {
            ConversacionSesion s = i.getArgument(0);
            if (s.getId() == null) { s.setId(UUID.randomUUID()); guardadas.add(s); }
            return s;
        });
        when(sesiones.findFirstByCanalCuentaIdAndContactoExternoAndEstado(any(), any(), any()))
            .thenAnswer(i -> guardadas.stream()
                .filter(s -> s.getCanalCuentaId().equals(i.getArgument(0))
                    && s.getContactoExterno().equals(i.getArgument(1)) && s.getEstado() == i.getArgument(2))
                .findFirst());
        when(mensajes.save(any())).thenAnswer(i -> { msgs.add(i.getArgument(0)); return i.getArgument(0); });
        when(mensajes.findTop20BySesionIdOrderByIdDesc(any())).thenAnswer(i -> {
            List<ConversacionMensaje> r = new ArrayList<>(msgs);
            java.util.Collections.reverse(r);
            return r;
        });

        enrutador = armar(Clock.fixed(T0, ZoneOffset.UTC));
    }

    private EnrutadorConversaciones armar(Clock clock) {
        SelectorPerfil selector = new SelectorPerfil(resolverProvider);
        ConversacionService svc = new ConversacionService(sesiones, mensajes, mock(UsuarioRepository.class), selector, clock);
        return new EnrutadorConversaciones(cuentas, svc, new RespondedorDespacho(respondedorProvider));
    }

    private CanalCuenta cuenta(Long empresaId, EstadoCanal estado) {
        CanalCuenta c = new CanalCuenta();
        c.setId(10L);
        c.setTipo(Canal.WHATSAPP);
        c.setIdExterno("PNID-1");
        c.setEmpresaId(empresaId);
        c.setEstado(estado);
        when(cuentas.buscar(Canal.WHATSAPP, "PNID-1")).thenReturn(Optional.of(c));
        return c;
    }

    private MensajeEntrante msg(String remitente, String texto) {
        return new MensajeEntrante(Canal.WHATSAPP, "PNID-1", remitente, "Nombre", "wamid.1", "text", texto, null, 1L);
    }

    @Test
    void cuentaDesconocidaSeDescarta() {
        when(cuentas.buscar(any(), any())).thenReturn(Optional.empty());
        enrutador.manejar(msg("WAID-1", "hola"));
        verify(sesiones, never()).save(any());
        verify(respondedor, never()).responder(any(), any());
    }

    @Test
    void cuentaPausadaODesconectadaSeDescarta() {
        for (EstadoCanal e : new EstadoCanal[]{EstadoCanal.PAUSADA, EstadoCanal.DESCONECTADA}) {
            cuenta(7L, e);
            enrutador.manejar(msg("WAID-1", "hola"));
        }
        verify(sesiones, never()).save(any());
        assertThat(msgs).isEmpty();
    }

    @Test
    void creaSesionGuardaMensajeYLlamaAlBot() throws Exception {
        cuenta(7L, EstadoCanal.ACTIVA);
        enrutador.manejar(msg("WAID-1", "hola"));
        assertThat(guardadas).hasSize(1);
        ConversacionSesion s = guardadas.get(0);
        assertThat(s.getEmpresaId()).isEqualTo(7L);
        assertThat(s.getPerfil()).isEqualTo(PerfilConversacion.NEGOCIO_VENTAS);
        assertThat(s.getModo()).isEqualTo(ModoConversacion.BOT);
        assertThat(s.getUltimoMensajeCliente()).isEqualTo(T0);
        assertThat(msgs).hasSize(1);
        assertThat(msgs.get(0).getRol()).isEqualTo("user");
        verify(respondedor).responder(any(), any());
    }

    @Test
    void segundoMensajeReutilizaLaSesion() {
        cuenta(7L, EstadoCanal.ACTIVA);
        enrutador.manejar(msg("WAID-1", "hola"));
        enrutador.manejar(msg("WAID-1", "precio?"));
        enrutador.manejar(msg("WAID-2", "otro cliente"));
        assertThat(guardadas).hasSize(2);
        assertThat(msgs).hasSize(3);
    }

    @Test
    void cuentaSinEmpresaEsPerfilHotclick() {
        cuenta(null, EstadoCanal.ACTIVA);
        enrutador.manejar(msg("WAID-1", "hola"));
        assertThat(guardadas.get(0).getPerfil()).isEqualTo(PerfilConversacion.HOTCLICK);
        assertThat(guardadas.get(0).getEmpresaId()).isNull();
    }

    @Test
    void telefonoVinculadoDeLaEmpresaEsPerfilInterno() {
        cuenta(7L, EstadoCanal.ACTIVA);
        TelefonoVinculadoResolver r = mock(TelefonoVinculadoResolver.class);
        when(r.usuarioVinculado(7L, "WAID-DUENO")).thenReturn(OptionalLong.of(99L));
        when(r.usuarioVinculado(7L, "WAID-1")).thenReturn(OptionalLong.empty());
        when(resolverProvider.getIfAvailable()).thenReturn(r);

        enrutador.manejar(msg("WAID-DUENO", "resumen del día"));
        enrutador.manejar(msg("WAID-1", "hola"));
        assertThat(guardadas.get(0).getPerfil()).isEqualTo(PerfilConversacion.NEGOCIO_INTERNO);
        assertThat(guardadas.get(0).getUsuarioId()).isEqualTo(99L);
        assertThat(guardadas.get(1).getPerfil()).isEqualTo(PerfilConversacion.NEGOCIO_VENTAS);
    }

    @Test
    void sinVinculacionDeTelefonosTodoRemitenteEsCliente() {
        cuenta(7L, EstadoCanal.ACTIVA);
        when(resolverProvider.getIfAvailable()).thenReturn(null);
        enrutador.manejar(msg("WAID-DUENO", "hola"));
        assertThat(guardadas.get(0).getPerfil()).isEqualTo(PerfilConversacion.NEGOCIO_VENTAS);
    }

    @Test
    void modoPersonaGuardaElMensajePeroNoLlamaAlBot() {
        cuenta(7L, EstadoCanal.ACTIVA);
        enrutador.manejar(msg("WAID-1", "hola"));
        guardadas.get(0).setModo(ModoConversacion.PERSONA);
        enrutador.manejar(msg("WAID-1", "¿alguien?"));
        assertThat(msgs).hasSize(2);
        verify(respondedor, times(1)).responder(any(), any());
    }

    @Test
    void sinRespondedorNoHaceNada() {
        cuenta(7L, EstadoCanal.ACTIVA);
        when(respondedorProvider.getIfAvailable()).thenReturn(null);
        enrutador.manejar(msg("WAID-1", "hola"));
        assertThat(msgs).hasSize(1);
    }

    @Test
    void fallaDelRespondedorNoSePropaga() {
        cuenta(7L, EstadoCanal.ACTIVA);
        doThrow(new RuntimeException("boom WAID-1 hola")).when(respondedor).responder(any(), any());
        enrutador.manejar(msg("WAID-1", "hola"));
        assertThat(msgs).hasSize(1);
    }

    @Test
    void mensajeSinTextoGuardaMarcadorDeTipo() {
        cuenta(7L, EstadoCanal.ACTIVA);
        enrutador.manejar(new MensajeEntrante(Canal.WHATSAPP, "PNID-1", "WAID-1", null, "wamid.2", "audio", null, "MEDIA-1", 1L));
        assertThat(msgs.get(0).getContenido()).isEqualTo("[audio]");
    }

    @Test
    void carreraAlCrearLaSesionReintentaUnaVez() {
        CanalCuenta c = cuenta(7L, EstadoCanal.ACTIVA);
        ConversacionService svc = mock(ConversacionService.class);
        ConversacionActiva conv = new ConversacionActiva(UUID.randomUUID(), PerfilConversacion.NEGOCIO_VENTAS, 7L, c,
            "WAID-1", null, ModoConversacion.BOT, T0, List.of());
        when(svc.registrarEntrante(any(), any())).thenThrow(new DataIntegrityViolationException("dup")).thenReturn(conv);
        RespondedorDespacho despacho = mock(RespondedorDespacho.class);
        new EnrutadorConversaciones(cuentas, svc, despacho).manejar(msg("WAID-1", "hola"));
        verify(svc, times(2)).registrarEntrante(any(), any());
        verify(despacho).despachar(any(), any());
    }

    @Test
    void ventanaDe24Horas() {
        CanalCuenta c = cuenta(7L, EstadoCanal.ACTIVA);
        ConversacionActiva conv = new ConversacionActiva(UUID.randomUUID(), PerfilConversacion.NEGOCIO_VENTAS, 7L, c,
            "WAID-1", null, ModoConversacion.BOT, T0, List.of());
        assertThat(conv.dentroDeVentana(T0.plusSeconds(23 * 3600))).isTrue();
        assertThat(conv.dentroDeVentana(T0.plusSeconds(24 * 3600))).isTrue();
        assertThat(conv.dentroDeVentana(T0.plusSeconds(24 * 3600 + 1))).isFalse();
        ConversacionActiva sin = new ConversacionActiva(UUID.randomUUID(), PerfilConversacion.HOTCLICK, null, c,
            "WAID-1", null, ModoConversacion.BOT, null, List.of());
        assertThat(sin.dentroDeVentana()).isFalse();
    }

    @Test
    void toStringNoFiltraContactoNiTexto() {
        CanalCuenta c = cuenta(7L, EstadoCanal.ACTIVA);
        ConversacionActiva conv = new ConversacionActiva(UUID.randomUUID(), PerfilConversacion.NEGOCIO_VENTAS, 7L, c,
            "WAID-SECRETO", null, ModoConversacion.BOT, T0,
            List.of(new ConversacionActiva.Turno("user", "TEXTO-PRIVADO", T0)));
        assertThat(conv.toString()).doesNotContain("WAID-SECRETO").doesNotContain("TEXTO-PRIVADO");
        assertThat(conv.historial().get(0).toString()).doesNotContain("TEXTO-PRIVADO");
    }
}

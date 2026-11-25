package com.hotclick.agente.bandeja;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaRepository;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conversacion.ConversacionMensaje;
import com.hotclick.agente.conversacion.ConversacionMensajeRepository;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import com.hotclick.agente.conversacion.EstadoConversacion;
import com.hotclick.agente.conversacion.ModoConversacion;
import com.hotclick.agente.conversacion.PerfilConversacion;
import com.hotclick.agente.conversacion.SelectorPerfil;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.List;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Aislamiento entre negocios, ventana de 24 h y envío por el canal correcto. */
class BandejaServiceTest {

    private static final Instant AHORA = Instant.parse("2026-11-24T12:00:00Z");

    private ConversacionSesionRepository sesiones;
    private ConversacionMensajeRepository mensajes;
    private UsuarioRepository usuarios;
    private CanalCuentaRepository cuentas;
    private CanalMensajeria canal;
    private BandejaService service;
    private ConversacionSesion sesion;
    private CanalCuenta cuenta;

    @BeforeEach
    void init() {
        sesiones = mock(ConversacionSesionRepository.class);
        mensajes = mock(ConversacionMensajeRepository.class);
        usuarios = mock(UsuarioRepository.class);
        cuentas = mock(CanalCuentaRepository.class);
        canal = mock(CanalMensajeria.class);
        ConversacionService conv = new ConversacionService(sesiones, mensajes, usuarios, new SelectorPerfil(null));
        service = new BandejaService(sesiones, mensajes, conv, cuentas, canal, mock(MiembroEmpresaRepository.class),
            Clock.fixed(AHORA, ZoneOffset.UTC));

        sesion = new ConversacionSesion();
        sesion.setId(UUID.randomUUID());
        sesion.setEmpresaId(7L);
        sesion.setCanal("WHATSAPP");
        sesion.setCanalCuentaId(10L);
        sesion.setPerfil(PerfilConversacion.NEGOCIO_VENTAS);
        sesion.setContactoExterno("50688881234");
        sesion.setUltimoMensajeCliente(AHORA.minusSeconds(3600));
        cuenta = new CanalCuenta();
        cuenta.setId(10L);
        cuenta.setTipo(MensajeEntrante.Canal.WHATSAPP);
        cuenta.setEmpresaId(7L);
        cuenta.setEstado(EstadoCanal.ACTIVA);

        when(sesiones.findById(sesion.getId())).thenReturn(Optional.of(sesion));
        when(sesiones.save(any())).thenAnswer(i -> i.getArgument(0));
        when(cuentas.findById(10L)).thenReturn(Optional.of(cuenta));
        when(mensajes.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void responderEnviaPorElCanalGuardaTurnoPersonaYDejaModoPersona() {
        BandejaDtos.Mensaje m = service.responder(sesion.getId(), 7L, "  Hola, ya lo revisamos  ");

        verify(canal).enviarTexto(cuenta, "50688881234", "Hola, ya lo revisamos");
        assertThat(m.rol()).isEqualTo(ConversacionMensaje.ROL_PERSONA);
        assertThat(sesion.getModo()).isEqualTo(ModoConversacion.PERSONA);
        assertThat(sesion.getUltimoMensajeEn()).isEqualTo(AHORA);
    }

    @Test
    void fueraDeLaVentanaDe24HResponde409SinEnviarNiGuardar() {
        sesion.setUltimoMensajeCliente(AHORA.minusSeconds(24 * 3600 + 1));

        assertThatThrownBy(() -> service.responder(sesion.getId(), 7L, "Hola"))
            .isInstanceOf(BandejaConflictoException.class)
            .hasMessageContaining("24 horas");
        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
        verify(mensajes, never()).save(any());
        assertThat(sesion.getModo()).isEqualTo(ModoConversacion.BOT);
    }

    @Test
    void sinMensajeDelClienteLaVentanaEstaCerrada() {
        sesion.setUltimoMensajeCliente(null);
        assertThatThrownBy(() -> service.responder(sesion.getId(), 7L, "Hola"))
            .isInstanceOf(BandejaConflictoException.class);
    }

    @Test
    void conversacionCerradaOCanalPausadoDan409() {
        cuenta.setEstado(EstadoCanal.PAUSADA);
        assertThatThrownBy(() -> service.responder(sesion.getId(), 7L, "Hola"))
            .isInstanceOf(BandejaConflictoException.class);
        cuenta.setEstado(EstadoCanal.ACTIVA);
        sesion.setEstado(EstadoConversacion.CERRADA);
        assertThatThrownBy(() -> service.responder(sesion.getId(), 7L, "Hola"))
            .isInstanceOf(BandejaConflictoException.class);
        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
    }

    @Test
    void textoVacioOMuyLargoEsInvalido() {
        assertThatThrownBy(() -> service.responder(sesion.getId(), 7L, "   ")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.responder(sesion.getId(), 7L, "x".repeat(1001)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void otroNegocioNoVeNiRespondeNiAccionaLaConversacion() {
        UUID id = sesion.getId();
        assertThatThrownBy(() -> service.detalle(id, 8L, 1L)).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> service.responder(id, 8L, "Hola")).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> service.pausar(id, 8L, 1L)).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> service.tomar(id, 8L, 1L)).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> service.asignar(id, 8L, 1L, 2L)).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> service.cerrar(id, 8L, 1L)).isInstanceOf(RecursoNoEncontradoException.class);
        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
        verify(sesiones, never()).save(any());
    }

    @Test
    void adminDePlataformaNoAlcanzaConversacionesDeUnNegocio() {
        assertThatThrownBy(() -> service.detalle(sesion.getId(), null, 1L)).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> service.responder(sesion.getId(), null, "Hola")).isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void adminDePlataformaSiAlcanzaLasDeHotClickYUnNegocioNoLasDeHotClick() {
        sesion.setEmpresaId(null);
        cuenta.setEmpresaId(null);
        assertThat(service.detalle(sesion.getId(), null, 1L).conversacion().id()).isEqualTo(sesion.getId());
        assertThatThrownBy(() -> service.detalle(sesion.getId(), 7L, 1L)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void conversacionInternaDelNegocioNoEsDeLaBandeja() {
        sesion.setPerfil(PerfilConversacion.NEGOCIO_INTERNO);
        assertThatThrownBy(() -> service.detalle(sesion.getId(), 7L, 1L)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void cuentaDeOtraEmpresaNoSirveParaResponder() {
        cuenta.setEmpresaId(99L);
        assertThatThrownBy(() -> service.responder(sesion.getId(), 7L, "Hola")).isInstanceOf(RecursoNoEncontradoException.class);
        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
    }

    @Test
    void asignarSoloAUsuarioDelNegocio() {
        when(usuarios.esMiembroActivoDeEmpresa(5L, 7L)).thenReturn(true);
        assertThat(service.asignar(sesion.getId(), 7L, 1L, 5L).asignadoAId()).isEqualTo(5L);
        assertThatThrownBy(() -> service.asignar(sesion.getId(), 7L, 1L, 6L)).isInstanceOf(TenantAccessDeniedException.class);
    }

    @Test
    void detalleEnmascaraElContactoYMarcaLaVentana() {
        BandejaDtos.Conversacion c = service.detalle(sesion.getId(), 7L, 1L).conversacion();
        assertThat(c.contacto()).isEqualTo("***1234").doesNotContain("5068888");
        assertThat(c.ventanaAbierta()).isTrue();
        assertThat(c.ventanaVenceEn()).isEqualTo(AHORA.minusSeconds(3600).plusSeconds(24 * 3600));
    }

    // ── AG-38: chats con nota baja ─────────────────────────────────────────────

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void listarNotaBajaFiltraPorNotaMenorOIgualADosYPorLaEmpresaDelLlamador() {
        sesion.setEstado(EstadoConversacion.CERRADA);
        sesion.setEncuestaNota(1);
        Page<ConversacionSesion> pagina = new PageImpl<>(List.of(sesion));
        when(sesiones.findAll(any(Specification.class), any(Pageable.class))).thenReturn((Page) pagina);
        when(mensajes.ultimosDe(any())).thenReturn(List.of());

        BandejaDtos.Pagina p = service.listarNotaBaja(7L, 1L, null, 0, 20);

        assertThat(p.items()).hasSize(1);
        assertThat(p.items().get(0).notaEncuesta()).isEqualTo(1);
        ArgumentCaptor<Specification> spec = ArgumentCaptor.forClass(Specification.class);
        verify(sesiones).findAll(spec.capture(), any(Pageable.class));

        Root<ConversacionSesion> root = mock(Root.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);
        Path<Object> ruta = mock(Path.class);
        when(root.get(anyString())).thenReturn(ruta);
        when(root.<Integer>get("encuestaNota")).thenReturn((Path) ruta);
        when(cb.and(any(Predicate[].class))).thenReturn(mock(Predicate.class));
        spec.getValue().toPredicate(root, mock(CriteriaQuery.class), cb);
        verify(cb).le(any(jakarta.persistence.criteria.Expression.class), eq(2));
        verify(cb, org.mockito.Mockito.atLeast(2)).isNotNull(ruta);
        verify(cb).equal(ruta, 7L);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void listarNotaBajaDelAdminSoloAlcanzaLasDeHotClick() {
        when(sesiones.findAll(any(Specification.class), any(Pageable.class))).thenReturn((Page) new PageImpl<>(List.of()));
        service.listarNotaBaja(null, 1L, "whatsapp", 0, 20);
        ArgumentCaptor<Specification> spec = ArgumentCaptor.forClass(Specification.class);
        verify(sesiones).findAll(spec.capture(), any(Pageable.class));

        Root<ConversacionSesion> root = mock(Root.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);
        Path<Object> ruta = mock(Path.class);
        when(root.get(anyString())).thenReturn(ruta);
        when(cb.and(any(Predicate[].class))).thenReturn(mock(Predicate.class));
        spec.getValue().toPredicate(root, mock(CriteriaQuery.class), cb);

        verify(cb, org.mockito.Mockito.atLeastOnce()).isNull(ruta);   // empresa null: solo el bot de HotClick
        verify(cb).equal(ruta, "WHATSAPP");
    }
}

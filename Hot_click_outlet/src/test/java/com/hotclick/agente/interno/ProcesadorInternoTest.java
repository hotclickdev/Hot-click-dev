package com.hotclick.agente.interno;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.interno.InternoTestSupport.Equipo;
import com.hotclick.agente.interno.InternoTestSupport.RelojMutable;
import com.hotclick.agente.interno.InternoTestSupport.RepoMemoria;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.telegram.TelegramFlujoSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProcesadorInternoTest {

    private static final long EMPRESA = 7L;
    private static final long USUARIO = 100L;
    private static final String TEL = "50660000001";
    private static final String PIN_OK = "4827";
    private static final String PIN_MAL = "7391";

    private RelojMutable reloj;
    private RepoMemoria memoria;
    private VinculacionInternaService vinc;
    private PinInternoService pins;
    private AccionPropuestaEjecutor ejecutor;
    private BitacoraAgente bitacora;
    private TelegramFlujoSupport permisos;
    private CanalMensajeria mensajeria;
    private ProcesadorInterno proc;
    private CanalCuenta cuenta;
    private Long vincId;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void init() throws Exception {
        reloj = new RelojMutable();
        memoria = new RepoMemoria(reloj);
        Equipo equipo = new Equipo().con(USUARIO, EMPRESA);
        vinc = new VinculacionInternaService(memoria.repo, equipo.usuarios, new HasherInterno("llave-de-prueba"), reloj);
        pins = new PinInternoService(memoria.repo, vinc, new BCryptPasswordEncoder(4), reloj);
        ejecutor = mock(AccionPropuestaEjecutor.class);
        bitacora = mock(BitacoraAgente.class);
        permisos = mock(TelegramFlujoSupport.class);
        mensajeria = mock(CanalMensajeria.class);
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        Usuario u = mock(Usuario.class);
        when(u.getCorreo()).thenReturn("equipo@ejemplo.test");
        when(usuarios.findById(USUARIO)).thenReturn(Optional.of(u));
        when(permisos.esPropietarioOAdmin(any(), anyLong())).thenReturn(true);
        proc = new ProcesadorInterno(vinc, pins, ejecutor, bitacora, usuarios, permisos, mensajeria, mapper);

        cuenta = new CanalCuenta();
        cuenta.setId(1L);
        cuenta.setTipo(Canal.WHATSAPP);
        cuenta.setEmpresaId(EMPRESA);

        vinc.activar(EMPRESA, TEL, vinc.generarCodigo(USUARIO, EMPRESA).codigo());
        pins.definir(USUARIO, EMPRESA, PIN_OK);
        vincId = memoria.filas.get(0).getId();
    }

    private void proponer() throws Exception {
        AccionPropuestaTelegram a = new AccionPropuestaTelegram(AccionPropuestaTelegram.PEDIDO_ESTADO, 55L,
            Map.of("nuevoEstado", "ENTREGADO"), "Cambiar el pedido ORD-1 a ENTREGADO");
        vinc.guardarPendiente(vincId, AgenteVinculacion.PEND_CONFIRMAR, mapper.writeValueAsString(a), Duration.ofMinutes(5));
    }

    private String ultimoMensaje() {
        ArgumentCaptor<String> c = ArgumentCaptor.forClass(String.class);
        verify(mensajeria, org.mockito.Mockito.atLeastOnce()).enviarTexto(any(), eq(TEL), c.capture());
        return c.getValue();
    }

    @Test
    void propuestaSinConfirmacionNoEjecutaNada() throws Exception {
        proponer();
        // Pasa el tiempo sin que nadie diga "SÍ": nada se aplica.
        reloj.avanzar(Duration.ofMinutes(6));
        proc.confirmar(cuenta, TEL);
        verify(ejecutor, never()).ejecutar(any(), anyLong(), anyString());
        assertThat(ultimoMensaje()).isEqualTo(ProcesadorInterno.MSG_NADA_PENDIENTE);
    }

    @Test
    void conSiPeroSinPinPideElPinYNoEjecuta() throws Exception {
        proponer();
        proc.confirmar(cuenta, TEL);
        verify(ejecutor, never()).ejecutar(any(), anyLong(), anyString());
        assertThat(ultimoMensaje()).isEqualTo(ProcesadorInterno.MSG_PEDIR_PIN_ACCION);
        assertThat(memoria.filas.get(0).getPendienteTipo()).isEqualTo(AgenteVinculacion.PEND_PIN_ACCION);
    }

    @Test
    void conSiYPinCorrectoEjecutaUnaVezYLoDejaEnBitacora() throws Exception {
        proponer();
        when(ejecutor.ejecutar(any(), eq(EMPRESA), eq("equipo@ejemplo.test")))
            .thenReturn(new AccionPropuestaEjecutor.Resultado(true, "Pedido ORD-1 actualizado a ENTREGADO."));
        proc.confirmar(cuenta, TEL);
        proc.pin(cuenta, TEL, PIN_OK);

        verify(ejecutor, times(1)).ejecutar(any(), eq(EMPRESA), eq("equipo@ejemplo.test"));
        verify(bitacora).registrar(EMPRESA, USUARIO, AccionPropuestaTelegram.PEDIDO_ESTADO, AgenteAccion.EJECUTADA, 55L);
        assertThat(ultimoMensaje()).startsWith("Hecho.").contains("ORD-1");
        assertThat(memoria.filas.get(0).getPendienteTipo()).isNull();

        // Un segundo "SÍ" no repite la acción.
        proc.confirmar(cuenta, TEL);
        verify(ejecutor, times(1)).ejecutar(any(), anyLong(), anyString());
    }

    @Test
    void conPinVigenteElSiEjecutaDirecto() throws Exception {
        pins.verificar(vincId, PIN_OK); // sesión abierta
        proponer();
        when(ejecutor.ejecutar(any(), eq(EMPRESA), anyString()))
            .thenReturn(new AccionPropuestaEjecutor.Resultado(true, "ok"));
        proc.confirmar(cuenta, TEL);
        verify(ejecutor).ejecutar(any(), eq(EMPRESA), anyString());

        // Pasada la sesión (15 min) vuelve a pedir el PIN.
        reloj.avanzar(Duration.ofMinutes(16));
        proponer();
        proc.confirmar(cuenta, TEL);
        verify(ejecutor, times(1)).ejecutar(any(), anyLong(), anyString());
        assertThat(ultimoMensaje()).isEqualTo(ProcesadorInterno.MSG_PEDIR_PIN_ACCION);
    }

    @Test
    void noCancelaNiEjecutaYQuedaCancelada() throws Exception {
        proponer();
        proc.cancelar(cuenta, TEL);
        verify(ejecutor, never()).ejecutar(any(), anyLong(), anyString());
        verify(bitacora).registrar(EMPRESA, USUARIO, AccionPropuestaTelegram.PEDIDO_ESTADO, AgenteAccion.CANCELADA, 55L);
        assertThat(memoria.filas.get(0).getPendienteTipo()).isNull();
    }

    @Test
    void pinIncorrectoNoEjecutaYAvisaLosIntentos() throws Exception {
        proponer();
        proc.confirmar(cuenta, TEL);
        proc.pin(cuenta, TEL, PIN_MAL);
        verify(ejecutor, never()).ejecutar(any(), anyLong(), anyString());
        assertThat(ultimoMensaje()).contains("PIN incorrecto").contains("4");
        assertThat(memoria.filas.get(0).getPendienteTipo()).isEqualTo(AgenteVinculacion.PEND_PIN_ACCION); // sigue esperando
    }

    @Test
    void cincoPinIncorrectosBloqueanYDescartanLaAccion() throws Exception {
        proponer();
        proc.confirmar(cuenta, TEL);
        for (int i = 0; i < 5; i++) proc.pin(cuenta, TEL, PIN_MAL);
        assertThat(ultimoMensaje()).isEqualTo(ProcesadorInterno.MSG_BLOQUEADO);
        assertThat(memoria.filas.get(0).getPendienteTipo()).isNull();
        // Aun con el PIN correcto, bloqueado.
        proponer();
        proc.confirmar(cuenta, TEL);
        proc.pin(cuenta, TEL, PIN_OK);
        verify(ejecutor, never()).ejecutar(any(), anyLong(), anyString());
    }

    @Test
    void elRolSeRevalidaAlEjecutar() throws Exception {
        pins.verificar(vincId, PIN_OK);
        proponer();
        when(permisos.esPropietarioOAdmin(any(), anyLong())).thenReturn(false); // lo bajaron de rol entre medio
        proc.confirmar(cuenta, TEL);
        verify(ejecutor, never()).ejecutar(any(), anyLong(), anyString());
        verify(bitacora).registrar(EMPRESA, USUARIO, AccionPropuestaTelegram.PEDIDO_ESTADO, AgenteAccion.RECHAZADA, 55L);
        assertThat(ultimoMensaje()).isEqualTo(ProcesadorInterno.MSG_SIN_PERMISO);
    }

    @Test
    void siFalloLaAccionQuedaComoErrorEnLaBitacora() throws Exception {
        pins.verificar(vincId, PIN_OK);
        proponer();
        when(ejecutor.ejecutar(any(), eq(EMPRESA), anyString()))
            .thenReturn(new AccionPropuestaEjecutor.Resultado(false, "Ese pedido ya no pertenece a este negocio."));
        proc.confirmar(cuenta, TEL);
        verify(bitacora).registrar(EMPRESA, USUARIO, AccionPropuestaTelegram.PEDIDO_ESTADO, AgenteAccion.ERROR, 55L);
        assertThat(ultimoMensaje()).doesNotStartWith("Hecho.");
    }

    @Test
    void pinParaFinanzasSoloAbreLaSesionYNoEjecutaAcciones() {
        vinc.guardarPendiente(vincId, AgenteVinculacion.PEND_PIN_FINANZAS, null, Duration.ofMinutes(5));
        proc.pin(cuenta, TEL, PIN_OK);
        assertThat(memoria.filas.get(0).pinVigente(reloj.instant())).isTrue();
        verify(ejecutor, never()).ejecutar(any(), anyLong(), anyString());
        assertThat(ultimoMensaje()).isEqualTo(ProcesadorInterno.MSG_PIN_OK_FINANZAS);
    }

    @Test
    void usuarioSinPinNoPuedeConfirmar() throws Exception {
        memoria.filas.get(0).setPinHash(null);
        proponer();
        proc.confirmar(cuenta, TEL);
        verify(ejecutor, never()).ejecutar(any(), anyLong(), anyString());
        assertThat(ultimoMensaje()).isEqualTo(ProcesadorInterno.MSG_SIN_PIN);
    }

    @Test
    void activarResponde() {
        proc.activar(cuenta, "50660000009", "ZZZZZZZZ");
        assertThat(mensajeriaUltimoPara("50660000009")).isEqualTo(ProcesadorInterno.MSG_CODIGO_INVALIDO);
    }

    private String mensajeriaUltimoPara(String dest) {
        ArgumentCaptor<String> c = ArgumentCaptor.forClass(String.class);
        verify(mensajeria).enviarTexto(any(), eq(dest), c.capture());
        return c.getValue();
    }
}

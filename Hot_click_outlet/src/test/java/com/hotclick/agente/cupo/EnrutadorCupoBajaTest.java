package com.hotclick.agente.cupo;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.EnrutadorConversaciones;
import com.hotclick.agente.conversacion.PerfilConversacion;
import com.hotclick.agente.conversacion.RespondedorDespacho;
import com.hotclick.agente.conversacion.spi.ControlCupoConversacion;
import com.hotclick.agente.conversacion.spi.InterceptorMensajeEntrante;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.util.Optional;
import java.util.stream.Stream;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("El enrutador respeta el cupo y los interceptores de baja antes del motor (AG-29)")
class EnrutadorCupoBajaTest {

    private CanalCuentaService cuentas;
    private ConversacionService conversaciones;
    private RespondedorDespacho despacho;
    private ObjectProvider<InterceptorMensajeEntrante> interceptores;
    private ObjectProvider<ControlCupoConversacion> cupo;
    private CanalCuenta cuenta;
    private MensajeEntrante mensaje;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void init() {
        cuentas = mock(CanalCuentaService.class);
        conversaciones = mock(ConversacionService.class);
        despacho = mock(RespondedorDespacho.class);
        interceptores = mock(ObjectProvider.class);
        cupo = mock(ObjectProvider.class);
        cuenta = CupoTestSupport.cuenta(7L);
        cuenta.setEstado(EstadoCanal.ACTIVA);
        mensaje = new MensajeEntrante(Canal.WHATSAPP, "PNID-1", "50688880001", "Ana", "wamid.1", "text", "hola", null, 1L);
        when(cuentas.buscar(Canal.WHATSAPP, "PNID-1")).thenReturn(Optional.of(cuenta));
        when(conversaciones.registrarEntrante(any(), any()))
            .thenReturn(CupoTestSupport.conversacion(7L, PerfilConversacion.NEGOCIO_VENTAS, "50688880001"));
    }

    private EnrutadorConversaciones enrutador() {
        return new EnrutadorConversaciones(cuentas, conversaciones, despacho, interceptores, cupo);
    }

    @Test
    @DisplayName("cupo agotado: el bot no se despacha (no se llama a Claude)")
    void cupoAgotadoNoDespacha() {
        ControlCupoConversacion control = mock(ControlCupoConversacion.class);
        when(control.permitir(any())).thenReturn(false);
        when(cupo.getIfAvailable()).thenReturn(control);
        when(interceptores.orderedStream()).thenReturn(Stream.empty());
        enrutador().manejar(mensaje);
        verify(despacho, never()).despachar(any(ConversacionActiva.class), any());
    }

    @Test
    @DisplayName("con cupo, el bot responde")
    void conCupoDespacha() {
        ControlCupoConversacion control = mock(ControlCupoConversacion.class);
        when(control.permitir(any())).thenReturn(true);
        when(cupo.getIfAvailable()).thenReturn(control);
        when(interceptores.orderedStream()).thenReturn(Stream.empty());
        enrutador().manejar(mensaje);
        verify(despacho).despachar(any(ConversacionActiva.class), any());
    }

    @Test
    @DisplayName("un interceptor de baja consume el mensaje: no se guarda, no llega al motor y no gasta cupo")
    void stopNoLlegaAlMotor() {
        InterceptorMensajeEntrante baja = mock(InterceptorMensajeEntrante.class);
        InterceptorMensajeEntrante interno = mock(InterceptorMensajeEntrante.class);
        when(baja.interceptar(any(), any())).thenReturn(true);
        when(interceptores.orderedStream()).thenAnswer(i -> Stream.of(baja, interno));
        ControlCupoConversacion control = mock(ControlCupoConversacion.class);
        when(cupo.getIfAvailable()).thenReturn(control);
        enrutador().manejar(mensaje);
        verify(conversaciones, never()).registrarEntrante(any(), any());
        verify(control, never()).permitir(any());
        verify(despacho, never()).despachar(any(ConversacionActiva.class), any());
        verify(interno, never()).interceptar(any(), any());
    }
}

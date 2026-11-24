package com.hotclick.agente.pago;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.enlace.EnlaceCompra;
import com.hotclick.agente.enlace.EnlaceCompraEstado;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.springframework.beans.factory.ObjectProvider;

import java.lang.reflect.Field;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.function.Supplier;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Fábricas de datos de prueba (sin teléfonos ni datos reales). */
public final class PagoBotTestSupport {

    public static final Instant AHORA = Instant.parse("2026-12-07T16:00:00Z");
    public static final LocalDateTime AHORA_CR = LocalDateTime.of(2026, 12, 7, 10, 0);
    public static final String CONTACTO = "contacto-de-prueba";

    private PagoBotTestSupport() { }

    public static EnlaceCompra enlace(long id, EnlaceCompraEstado estado, UUID sesion, LocalDateTime creado) {
        EnlaceCompra e = new EnlaceCompra();
        poner(e, "id", id);
        e.setCodigo("CodigoDePrueba" + id);
        e.setEmpresaId(7L);
        e.setCanal("WHATSAPP");
        e.setEstado(estado);
        e.setChatSesionId(sesion);
        e.setNombreCliente("Cliente Prueba");
        e.setCreado(creado);
        e.setVence(creado.plusHours(24));
        return e;
    }

    public static ConversacionSesion sesion(UUID id, Instant ultimoMensajeCliente) {
        ConversacionSesion s = new ConversacionSesion();
        s.setId(id);
        s.setEmpresaId(7L);
        s.setCanal("WHATSAPP");
        s.setCanalCuentaId(5L);
        s.setContactoExterno(CONTACTO);
        s.setUltimoMensajeCliente(ultimoMensajeCliente);
        return s;
    }

    public static CanalCuenta cuenta(EstadoCanal estado) {
        CanalCuenta c = new CanalCuenta();
        c.setId(5L);
        c.setTipo(MensajeEntrante.Canal.WHATSAPP);
        c.setEmpresaId(7L);
        c.setEstado(estado);
        return c;
    }

    @SuppressWarnings("unchecked")
    public static <T> ObjectProvider<T> proveedor(T bean) {
        ObjectProvider<T> p = mock(ObjectProvider.class);
        when(p.getIfAvailable(any(Supplier.class))).thenAnswer(inv -> {
            if (bean != null) return bean;
            return ((Supplier<T>) inv.getArgument(0)).get();
        });
        return p;
    }

    static void poner(Object o, String campo, Object valor) {
        try {
            Field f = o.getClass().getDeclaredField(campo);
            f.setAccessible(true);
            f.set(o, valor);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException(ex);
        }
    }
}

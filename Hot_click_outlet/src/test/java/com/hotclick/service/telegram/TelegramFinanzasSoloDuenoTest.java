package com.hotclick.service.telegram;

import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.service.TelegramClienteBotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** «Finanzas del mes» (callback «fin») es solo para el dueño: PROPIETARIO o dueño directo, no ADMIN/LECTOR/CAJERO. */
@DisplayName("Telegram: finanzas del mes solo para el dueño")
class TelegramFinanzasSoloDuenoTest {

    private static final long EMPRESA = 3L, CHAT = 88L;

    private final MiembroEmpresaRepository mr = mock(MiembroEmpresaRepository.class);
    private final TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
    private final TelegramEmpresaContextService ctx = mock(TelegramEmpresaContextService.class);
    private TelegramFlujoSupport soporte;
    private TelegramDatosQueryService datos;
    private TelegramVinculacion v;

    @BeforeEach
    void setUp() {
        soporte = new TelegramFlujoSupport();
        ReflectionTestUtils.setField(soporte, "miembroEmpresaRepository", mr);
        datos = spy(new TelegramDatosQueryService());
        ReflectionTestUtils.setField(datos, "bot", bot);
        ReflectionTestUtils.setField(datos, "empresaContext", ctx);
        ReflectionTestUtils.setField(datos, "flujoSupport", soporte);
        doReturn("FINANZAS-REALES").when(datos).mensajeFinanzasMes(EMPRESA);
        when(ctx.empresaValidada(any())).thenReturn(EMPRESA);
    }

    private Usuario usuario(Long empresaIdDirecta) {
        Usuario u = new Usuario();
        u.setId(5L);
        if (empresaIdDirecta != null) {
            com.hotclick.model.Empresa e = new com.hotclick.model.Empresa();
            e.setId(empresaIdDirecta);
            u.setEmpresa(e);
        }
        v = new TelegramVinculacion();
        v.setUsuario(u);
        v.setChatId(CHAT);
        return u;
    }

    private void conRol(String rol) {
        MiembroEmpresa m = new MiembroEmpresa();
        m.setRolEnEmpresa(rol);
        when(mr.findByUsuarioIdAndEmpresaIdAndEstado(5L, EMPRESA, 1)).thenReturn(Optional.of(m));
    }

    @Test
    @DisplayName("esDueno: PROPIETARIO sí; ADMIN, CAJERO y LECTOR no")
    void esDuenoPorRol() {
        Usuario u = usuario(null);
        conRol("PROPIETARIO");
        assertThat(soporte.esDueno(u, EMPRESA)).isTrue();
        for (String rol : new String[]{"ADMIN", "CAJERO", "LECTOR"}) {
            conRol(rol);
            assertThat(soporte.esDueno(u, EMPRESA)).as(rol).isFalse();
        }
    }

    @Test
    @DisplayName("esDueno: el dueño directo (usuario.empresaId) cuenta aunque no tenga fila de membresía")
    void esDuenoDirecto() {
        assertThat(soporte.esDueno(usuario(EMPRESA), EMPRESA)).isTrue();
        assertThat(soporte.esDueno(usuario(99L), EMPRESA)).isFalse();
        assertThat(soporte.esDueno(null, EMPRESA)).isFalse();
    }

    @Test
    @DisplayName("usuario.empresaId = empresa pero rol ADMIN/CAJERO/LECTOR: no es dueño ni ve finanzas; PROPIETARIO sí")
    void empresaIdDirectaNoOtorgaDuenoSiHayRolNoPropietario() {
        Usuario u = usuario(EMPRESA);
        for (String rol : new String[]{"ADMIN", "CAJERO", "LECTOR"}) {
            conRol(rol);
            assertThat(soporte.esDueno(u, EMPRESA)).as(rol).isFalse();
            datos.mostrarFinanzasMes(v);
        }
        verify(datos, never()).mensajeFinanzasMes(any());
        conRol("PROPIETARIO");
        assertThat(soporte.esDueno(u, EMPRESA)).isTrue();
    }

    @Test
    @DisplayName("callback «fin» de un LECTOR no expone las finanzas")
    void noDuenoNoRecibeFinanzas() {
        usuario(null);
        conRol("LECTOR");

        datos.mostrarFinanzasMes(v);

        verify(datos, never()).mensajeFinanzasMes(any());
        verify(bot, never()).enviarMensaje(eq(CHAT), contains("FINANZAS-REALES"), any());
        verify(bot).enviarMensaje(eq(CHAT), eq("Solo el dueño del negocio puede ver las finanzas."), any());
    }

    @Test
    @DisplayName("callback «fin» de un ADMIN del equipo tampoco expone las finanzas")
    void adminNoRecibeFinanzas() {
        usuario(null);
        conRol("ADMIN");

        datos.mostrarFinanzasMes(v);

        verify(datos, never()).mensajeFinanzasMes(any());
    }

    @Test
    @DisplayName("el PROPIETARIO sí recibe las finanzas")
    void duenoRecibeFinanzas() {
        usuario(null);
        conRol("PROPIETARIO");

        datos.mostrarFinanzasMes(v);

        verify(bot).enviarMensaje(eq(CHAT), eq("FINANZAS-REALES"), any());
    }
}

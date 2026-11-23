package com.hotclick.service.telegram;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.service.TelegramBotUpdateService;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramFlujoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cableado del ruteo real de texto libre: lo que llega a {@code responderConIa} como {@code esDueno}
 * sale de la membresía real (cadena TelegramFlujoService → TelegramFlujoSupport), no de una constante.
 */
@DisplayName("Telegram: despacharIa pasa el esDueno real a responderConIa")
class TelegramRoutingEsDuenoTest {

    private static final long EMPRESA = 7L, CHAT = 88L;

    private final MiembroEmpresaRepository miembros = mock(MiembroEmpresaRepository.class);
    private final TelegramBotUpdateService self = mock(TelegramBotUpdateService.class);
    private final TelegramEmpresaContextService ctx = mock(TelegramEmpresaContextService.class);
    private final TelegramPlanConsulta plan = mock(TelegramPlanConsulta.class);
    private TelegramMessageRoutingHelper helper;

    @BeforeEach
    void setUp() {
        TelegramFlujoSupport soporte = new TelegramFlujoSupport();
        ReflectionTestUtils.setField(soporte, "miembroEmpresaRepository", miembros);
        TelegramFlujoService flujo = new TelegramFlujoService();
        ReflectionTestUtils.setField(flujo, "support", soporte);

        helper = new TelegramMessageRoutingHelper();
        ReflectionTestUtils.setField(helper, "bot", mock(TelegramClienteBotService.class));
        ReflectionTestUtils.setField(helper, "empresaContext", ctx);
        ReflectionTestUtils.setField(helper, "telegramFlujoService", flujo);
        ReflectionTestUtils.setField(helper, "self", self);
        ReflectionTestUtils.setField(helper, "planConsulta", plan);
        when(ctx.empresaValidada(any())).thenReturn(EMPRESA);
        when(plan.tieneIa(EMPRESA)).thenReturn(true);
    }

    private TelegramVinculacion vinculo() {
        Usuario u = new Usuario();
        u.setId(5L);
        u.setNombre("Prueba");
        Empresa e = new Empresa();
        e.setId(EMPRESA);
        u.setEmpresa(e); // conserva empresa directa: un ex-miembro la sigue teniendo
        TelegramVinculacion v = new TelegramVinculacion();
        v.setUsuario(u);
        v.setChatId(CHAT);
        return v;
    }

    private MiembroEmpresa miembro(String rol) {
        MiembroEmpresa m = new MiembroEmpresa();
        m.setRolEnEmpresa(rol);
        return m;
    }

    private boolean esDuenoRecibido() {
        helper.despacharIa(vinculo(), CHAT, "¿cuánto vendí este mes?");
        ArgumentCaptor<Boolean> esDueno = ArgumentCaptor.forClass(Boolean.class);
        verify(self).responderConIa(eq(CHAT), eq(EMPRESA), anyString(), any(), anyBoolean(), esDueno.capture());
        return esDueno.getValue();
    }

    @Test
    @DisplayName("LECTOR activo → esDueno=false")
    void lector() {
        when(miembros.findByUsuarioIdAndEmpresaIdAndEstado(5L, EMPRESA, 1)).thenReturn(Optional.of(miembro("LECTOR")));
        assertThat(esDuenoRecibido()).isFalse();
    }

    @Test
    @DisplayName("Ex-miembro (membresía estado 0, conserva usuario.empresaId) → esDueno=false")
    void exMiembro() {
        when(miembros.findByUsuarioIdAndEmpresaIdAndEstado(5L, EMPRESA, 1)).thenReturn(Optional.empty());
        when(miembros.findByUsuarioIdAndEmpresaId(5L, EMPRESA)).thenReturn(Optional.of(miembro("PROPIETARIO")));
        assertThat(esDuenoRecibido()).isFalse();
    }

    @Test
    @DisplayName("PROPIETARIO activo → esDueno=true")
    void propietario() {
        when(miembros.findByUsuarioIdAndEmpresaIdAndEstado(5L, EMPRESA, 1)).thenReturn(Optional.of(miembro("PROPIETARIO")));
        assertThat(esDuenoRecibido()).isTrue();
    }
}

package com.hotclick.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.EmbudoRegistroRequest;
import com.hotclick.dto.PublicChatRequest;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.analytics.EmbudoSesionService;
import com.hotclick.service.PublicChatService;
import com.hotclick.service.TextModerationService;
import com.hotclick.service.shoppingassistant.AsistenteCuotaDiaria;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.concurrent.Executor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * LOW (limitador): las llaves de EmbudoController y PublicChatController llevaban la IP completa (y "null" si no
 * había). Ahora van por {@code IpParaLlave}: IPv6 → /64, sin IP → "desconocida".
 */
@DisplayName("Llaves por IP de Embudo y PublicChat: /64 en IPv6 y sin 'null'")
class LlavesIpControllersIpv6Test {

    private static final String IP_A = "2001:db8:aa:bb:1111:2222:3333:4444";
    private static final String IP_B = "2001:db8:aa:bb:ffff:eeee:dddd:cccc";

    // ── Embudo ────────────────────────────────────────────────────────────────────

    private String llaveEmbudo(String ip) {
        RateLimiter rl = mock(RateLimiter.class);
        ClientIpResolver ips = mock(ClientIpResolver.class);
        when(ips.resolve(any())).thenReturn(ip);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        EmbudoController c = new EmbudoController(mock(EmbudoSesionService.class), rl, ips, 120);
        c.registrar(new EmbudoRegistroRequest("0b5f2c1e-3f0a-4d0e-9a52-1d6f0c9a7b11", "paso", null, null), new MockHttpServletRequest());
        ArgumentCaptor<String> k = ArgumentCaptor.forClass(String.class);
        verify(rl).tryAcquire(k.capture(), anyInt(), anyInt());
        return k.getValue();
    }

    @Test
    @DisplayName("Embudo: dos direcciones del mismo /64 comparten llave y la IP completa no aparece")
    void embudoSlash64() {
        String a = llaveEmbudo(IP_A);
        assertThat(a).isEqualTo(llaveEmbudo(IP_B));
        assertThat(a).doesNotContain("1111").doesNotContain("4444").contains("/64");
    }

    @Test
    @DisplayName("Embudo: sin IP la llave es 'desconocida', no 'null'")
    void embudoSinIp() {
        assertThat(llaveEmbudo(null)).isEqualTo("embudo:ip:desconocida:hora");
    }

    // ── PublicChat ────────────────────────────────────────────────────────────────

    private String llaveChat(String ip) {
        PublicChatController controller = new PublicChatController();
        RateLimiter rl = mock(RateLimiter.class);
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        Empresa empresa = new Empresa();
        empresa.setId(7L);
        when(empresas.findBySlug("tienda")).thenReturn(Optional.of(empresa));
        TextModerationService moderacion = mock(TextModerationService.class);
        when(moderacion.moderar(any(String[].class))).thenReturn(new TextModerationService.ModerationResult(true, null));
        ClientIpResolver ips = mock(ClientIpResolver.class);
        when(ips.resolve(any())).thenReturn(ip);
        Executor directo = Runnable::run;
        ReflectionTestUtils.setField(controller, "chatService", mock(PublicChatService.class));
        ReflectionTestUtils.setField(controller, "empresaRepository", empresas);
        ReflectionTestUtils.setField(controller, "rateLimiter", rl);
        ReflectionTestUtils.setField(controller, "clientIpResolver", ips);
        ReflectionTestUtils.setField(controller, "sseExecutor", directo);
        ReflectionTestUtils.setField(controller, "textModerationService", moderacion);
        ReflectionTestUtils.setField(controller, "objectMapper", new ObjectMapper());
        ReflectionTestUtils.setField(controller, "maxDiarioVisitante", 60);
        ReflectionTestUtils.setField(controller, "maxDiarioEmpresa", 3000);
        ReflectionTestUtils.setField(controller, "maxDiarioGlobal", 5000);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        when(rl.tryAcquireEstricto(anyString(), anyInt(), anyInt())).thenReturn(true);
        AsistenteCuotaDiaria cuota = mock(AsistenteCuotaDiaria.class);
        when(cuota.reservar(any(), anyBoolean(), any())).thenReturn(AsistenteCuotaDiaria.Reserva.OK);
        ReflectionTestUtils.setField(controller, "asistenteCuota", cuota);
        PublicChatRequest body = new PublicChatRequest();
        body.setMessage("una lampara");
        controller.chat("tienda", body, new MockHttpServletRequest());
        ArgumentCaptor<String> k = ArgumentCaptor.forClass(String.class);
        verify(rl, atLeastOnce()).tryAcquire(k.capture(), anyInt(), anyInt());
        return k.getAllValues().stream().filter(s -> s.startsWith("public_chat:ip:")).findFirst().orElseThrow();
    }

    @Test
    @DisplayName("PublicChat: mismo /64 → misma llave, sin la IP completa")
    void chatSlash64() {
        String a = llaveChat(IP_A);
        assertThat(a).isEqualTo(llaveChat(IP_B));
        assertThat(a).doesNotContain("1111").doesNotContain("4444").contains("/64");
    }

    @Test
    @DisplayName("PublicChat: sin IP la llave es 'desconocida', no 'null'")
    void chatSinIp() {
        assertThat(llaveChat(null)).isEqualTo("public_chat:ip:desconocida:day");
    }
}

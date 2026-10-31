package com.hotclick.service.payment;

import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.ResendEmailService;
import com.hotclick.service.email.AdminItSinCorreoException;
import com.hotclick.service.email.NotificacionNegocioEmailSender;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

@DisplayName("[Aviso admin] BAJOs #477: cola llena, timeouts de SendGrid y adminit.email vacío")
class AvisoReembolsoPendienteUnidadTest {

    @Test
    @DisplayName("BAJO 1: con la cola llena se descarta (sin excepción) y el envío NO corre en el hilo que encola")
    void colaLlenaDescarta() {
        AvisoReembolsoPendienteService s = new AvisoReembolsoPendienteService();
        Executor lleno = mock(Executor.class);
        doThrow(new RejectedExecutionException("lleno")).when(lleno).execute(any());
        NotificacionEmailService notif = mock(NotificacionEmailService.class);
        ReflectionTestUtils.setField(s, "taskExecutor", lleno);
        ReflectionTestUtils.setField(s, "notificacionEmailService", notif);

        s.avisarDespuesDelCommit(77L);

        verifyNoInteractions(notif);
    }

    @Test
    @DisplayName("BAJO 1: el executor del aviso usa AbortPolicy, no CallerRunsPolicy")
    void executorSinCallerRuns() {
        var ex = (org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor)
            new com.hotclick.config.AsyncConfig().avisoReembolsoExecutor(1);
        try {
            assertThat(ex.getThreadPoolExecutor().getRejectedExecutionHandler())
                .isInstanceOf(java.util.concurrent.ThreadPoolExecutor.AbortPolicy.class);
        } finally {
            ex.shutdown();
        }
    }

    @Test
    @DisplayName("BAJO 3: sin adminit.email el aviso y el resumen lanzan AdminItSinCorreoException y no mandan nada")
    void sinAdminItLanza() {
        NotificacionEmailService n = new NotificacionEmailService();
        NotificacionNegocioEmailSender sender = mock(NotificacionNegocioEmailSender.class);
        ReflectionTestUtils.setField(n, "negocioEmailSender", sender);
        ReflectionTestUtils.setField(n, "adminItEmail", " ");
        assertThatThrownBy(() -> n.enviarAvisoReembolsoPendienteAAdminIT(1L, "REEMBOLSO_PENDIENTE", "x"))
            .isInstanceOf(AdminItSinCorreoException.class);
        assertThatThrownBy(() -> n.enviarResumenReembolsosPendientesAAdminIT(List.of(), "x"))
            .isInstanceOf(AdminItSinCorreoException.class);
        verifyNoInteractions(sender);
    }
}

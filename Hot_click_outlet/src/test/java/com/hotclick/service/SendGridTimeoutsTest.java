package com.hotclick.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("[Correo] BAJO 2 #477: SendGrid con timeouts")
class SendGridTimeoutsTest {

    @Test
    @DisplayName("BAJO 2: el cliente de SendGrid tiene timeouts de conexión y lectura configurables")
    void sendGridConTimeouts() {
        ResendEmailService r = new ResendEmailService();
        ReflectionTestUtils.setField(r, "sendGridConnectTimeoutMs", 7_000);
        ReflectionTestUtils.setField(r, "sendGridReadTimeoutMs", 9_000);
        var cfg = r.requestConfigSendGrid();
        assertThat(cfg.getConnectTimeout()).isEqualTo(7_000);
        assertThat(cfg.getConnectionRequestTimeout()).isEqualTo(7_000);
        assertThat(cfg.getSocketTimeout()).isEqualTo(9_000);
        assertThat(new ResendEmailService().requestConfigSendGrid().getSocketTimeout()).isEqualTo(10_000);
    }

}

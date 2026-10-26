package com.hotclick.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("RateLimiter.tryAcquireEstricto — fail-closed ante error de BD")
class RateLimiterEstrictoTest {

    @Test
    void bdCaida_estrictoNiega_normalDejaPasar() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(anyString(), eq(Long.class), any()))
            .thenThrow(new DataAccessResourceFailureException("caida"));
        RateLimiter rl = new RateLimiter(jdbc);

        assertThat(rl.tryAcquireEstricto("public_chat:global:day", 5000, 86_400)).isFalse();
        assertThat(rl.tryAcquire("public_chat:global:day", 5000, 86_400)).isTrue();
    }
}

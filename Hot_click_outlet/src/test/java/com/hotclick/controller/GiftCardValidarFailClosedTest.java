package com.hotclick.controller;

import com.hotclick.security.CompanyScope;
import com.hotclick.security.RateLimiter;
import com.hotclick.security.TenantContext;
import com.hotclick.service.GiftCardService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Validar gift card es FAIL-CLOSED: si la BD del limitador falla (tryAcquireEstricto real) se niega, no se deja pasar. */
class GiftCardValidarFailClosedTest {

    @AfterEach
    void limpiar() {
        TenantContext.clear();
    }

    private GiftCardController controlador(RateLimiter rl, GiftCardService servicio) {
        GiftCardController c = new GiftCardController();
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.getCurrentUserId()).thenReturn(7L);
        ReflectionTestUtils.setField(c, "giftCardService", servicio);
        ReflectionTestUtils.setField(c, "rateLimiter", rl);
        ReflectionTestUtils.setField(c, "companyScope", scope);
        return c;
    }

    @Test
    void baseDelLimitadorCaida_niegaConEstricto_yNoConsultaElCodigo() {
        TenantContext.set(1L);
        JdbcTemplate jdbcRoto = mock(JdbcTemplate.class);
        when(jdbcRoto.queryForList(anyString(), eq(Long.class), any(Object[].class)))
            .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("BD caída"));
        GiftCardService servicio = mock(GiftCardService.class);

        ResponseEntity<?> r = controlador(new RateLimiter(jdbcRoto), servicio).validar("ABCDEFGH12");

        assertThat(r.getStatusCode().value()).isEqualTo(429);
        verifyNoInteractions(servicio);
    }

    @Test
    void usaLaClavePorUsuarioConElAcquireEstricto() {
        TenantContext.set(1L);
        RateLimiter rl = mock(RateLimiter.class);
        when(rl.tryAcquireEstricto(eq("user:7:gift-cards:validar"), eq(10), eq(60))).thenReturn(false);

        ResponseEntity<?> r = controlador(rl, mock(GiftCardService.class)).validar("ABCDEFGH12");

        assertThat(r.getStatusCode().value()).isEqualTo(429);
        verify(rl, never()).tryAcquire(anyString(), anyInt(), anyInt());
    }
}

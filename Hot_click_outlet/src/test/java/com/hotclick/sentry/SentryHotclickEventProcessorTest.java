package com.hotclick.sentry;

import com.hotclick.security.TenantContext;
import io.sentry.Hint;
import io.sentry.SentryEvent;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SentryHotclickEventProcessor")
class SentryHotclickEventProcessorTest {

    private final SentryHotclickEventProcessor processor = new SentryHotclickEventProcessor();

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        SentryRequestContext.clear();
    }

    @Test
    @DisplayName("Pone empresa_id, user_id y rol sin correo")
    void tagsSinPii() {
        TenantContext.set(42L);
        SentryRequestContext.set(7L, "EMPRENDEDOR");

        SentryEvent event = processor.process(new SentryEvent(), new Hint());

        assertThat(event.getTag("empresa_id")).isEqualTo("42");
        assertThat(event.getTag("user_id")).isEqualTo("7");
        assertThat(event.getTag("rol")).isEqualTo("EMPRENDEDOR");
        assertThat(event.getUser()).isNotNull();
        assertThat(event.getUser().getId()).isEqualTo("7");
        assertThat(event.getUser().getEmail()).isNull();
    }
}

package com.hotclick.security.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityHeadersWriterCspTest {

    @Test
    void cspIncluyeFormActionSelf() {
        MockHttpServletResponse res = new MockHttpServletResponse();
        SecurityHeadersWriter.create("https://bucket.example").writeHeaders(new MockHttpServletRequest(), res);
        String csp = res.getHeader("Content-Security-Policy");
        assertThat(csp).contains("form-action 'self'").contains("base-uri 'self'").contains("object-src 'none'");
        assertThat(csp).doesNotContain("form-action *");
    }
}

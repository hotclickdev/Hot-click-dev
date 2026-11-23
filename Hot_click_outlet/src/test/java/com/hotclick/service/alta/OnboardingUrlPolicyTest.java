package com.hotclick.service.alta;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Enlace de onboarding: solo https de dominios ONVO permitidos")
class OnboardingUrlPolicyTest {

    @Test
    void aceptaHttpsDeDominiosOnvo() {
        assertThat(OnboardingUrlPolicy.esPermitida("https://onvopay.com/setup/abc", null)).isTrue();
        assertThat(OnboardingUrlPolicy.esPermitida("https://app.onvopay.com/setup/abc", "onvopay.com")).isTrue();
        assertThat(OnboardingUrlPolicy.esPermitida("https://pay.onvo.cr/x", null)).isTrue();
    }

    @Test
    void rechazaTodoLoDemas() {
        assertThat(OnboardingUrlPolicy.esPermitida("http://onvopay.com/setup", null)).isFalse();
        assertThat(OnboardingUrlPolicy.esPermitida("https://evil.com/onvopay.com", null)).isFalse();
        assertThat(OnboardingUrlPolicy.esPermitida("https://onvopay.com.evil.com/x", null)).isFalse();
        assertThat(OnboardingUrlPolicy.esPermitida("https://notonvopay.com/x", null)).isFalse();
        assertThat(OnboardingUrlPolicy.esPermitida("https://user:pw@onvopay.com/x", null)).isFalse();
        assertThat(OnboardingUrlPolicy.esPermitida("javascript:alert(1)", null)).isFalse();
        assertThat(OnboardingUrlPolicy.esPermitida("", null)).isFalse();
        assertThat(OnboardingUrlPolicy.esPermitida(null, null)).isFalse();
        assertThat(OnboardingUrlPolicy.esPermitida("https://%zz", null)).isFalse();
    }
}

package com.hotclick.service.publicchat;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PublicChatBudgetRegaloTest {
    @Test
    void regaloParaMamaExtraePrecioMaximo() {
        assertThat(PublicChatBudgetExtractor.extractMaxBudget("Regalo para mamá por menos de ₡20.000")).isEqualTo(20000L);
    }
}

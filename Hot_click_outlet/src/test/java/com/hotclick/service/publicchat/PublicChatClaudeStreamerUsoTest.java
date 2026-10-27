package com.hotclick.service.publicchat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.service.ai.ClaudeUsoRegistrador;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@DisplayName("PublicChatClaudeStreamer — tokens del stream")
class PublicChatClaudeStreamerUsoTest {

    private final PublicChatClaudeStreamer streamer = new PublicChatClaudeStreamer(
        new ObjectMapper(), new PublicChatPromptBuilder(), mock(PublicChatMockResponses.class),
        mock(ClaudeUsoRegistrador.class));

    @Test
    @DisplayName("message_start aporta input y cache; message_delta el output final")
    void acumulaUsageDelStream() {
        long[] uso = new long[4];
        streamer.acumularUso("event: message_start", uso);
        streamer.acumularUso("data: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":25,"
            + "\"cache_read_input_tokens\":1000,\"cache_creation_input_tokens\":200,\"output_tokens\":1}}}", uso);
        streamer.acumularUso("data: {\"type\":\"content_block_delta\",\"delta\":{\"text\":\"hola usage\"}}", uso);
        streamer.acumularUso("data: {\"type\":\"message_delta\",\"usage\":{\"output_tokens\":88}}", uso);

        assertThat(uso).containsExactly(25L, 88L, 1000L, 200L);
    }

    @Test
    @DisplayName("Lineas ilegibles se ignoran sin romper el stream")
    void ignoraBasura() {
        long[] uso = new long[4];
        streamer.acumularUso("data: {no es json usage", uso);
        assertThat(uso).containsExactly(0L, 0L, 0L, 0L);
    }
}

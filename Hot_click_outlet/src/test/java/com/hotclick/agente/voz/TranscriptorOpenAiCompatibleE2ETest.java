package com.hotclick.agente.voz;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Prueba manual contra un Whisper autohospedado (speaches o similar). Se salta si no está
 * {@code AGENTE_VOZ_E2E_URL}. Variables: {@code AGENTE_VOZ_E2E_URL} (base, p. ej. http://127.0.0.1:8765/v1),
 * {@code AGENTE_VOZ_E2E_AUDIO} (ruta a un OGG/Opus con una frase corta en español que contenga "tenis") y,
 * opcional, {@code AGENTE_VOZ_E2E_MODELO}. Ver docs/agente-ia/voz-whisper-autohospedado.md.
 */
@EnabledIfEnvironmentVariable(named = "AGENTE_VOZ_E2E_URL", matches = ".+")
class TranscriptorOpenAiCompatibleE2ETest {

    @Test
    void transcribeContraServidorLocal() throws Exception {
        String base = System.getenv("AGENTE_VOZ_E2E_URL");
        Path audio = Path.of(System.getenv("AGENTE_VOZ_E2E_AUDIO"));
        String modelo = System.getenv().getOrDefault("AGENTE_VOZ_E2E_MODELO", "small");
        VozConfig cfg = new VozConfig(16_777_216, 120, 60, 0);
        var t = new TranscriptorOpenAiCompatible(cfg, base, "local", modelo, TranscriptorOpenAiCompatible.nuevoCliente(cfg));
        assertThat(t.habilitado()).isTrue();
        byte[] bytes = Files.readAllBytes(audio);
        for (int i = 1; i <= 3; i++) {
            long t0 = System.nanoTime();
            ResultadoVoz r = t.transcribir(new AudioVoz(bytes, "audio/ogg"));
            long ms = (System.nanoTime() - t0) / 1_000_000;
            System.out.println("[e2e-voz] intento " + i + " ms=" + ms + " segundos=" + r.segundos() + " texto=" + r.texto());
            assertThat(r.segundos()).isGreaterThan(0);
            assertThat(r.texto().toLowerCase()).contains("tenis");
        }
    }
}

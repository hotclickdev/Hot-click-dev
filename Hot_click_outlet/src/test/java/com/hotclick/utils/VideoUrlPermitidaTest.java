package com.hotclick.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("ESC-4 | video de producto solo de YouTube, Instagram o TikTok")
class VideoUrlPermitidaTest {

    @Test
    void permitidos() {
        assertThat(VideoUrlPermitida.esPermitida("https://www.youtube.com/watch?v=abc")).isTrue();
        assertThat(VideoUrlPermitida.esPermitida("https://youtu.be/abc")).isTrue();
        assertThat(VideoUrlPermitida.esPermitida("https://www.instagram.com/reel/xyz/")).isTrue();
        assertThat(VideoUrlPermitida.esPermitida("https://www.tiktok.com/@a/video/1")).isTrue();
        assertThat(VideoUrlPermitida.esPermitida("")).isTrue();
    }

    @Test
    void rechazados() {
        assertThat(VideoUrlPermitida.esPermitida("https://ejemplo-qa-test.com/video.mp4")).isFalse();
        assertThat(VideoUrlPermitida.esPermitida("http://www.youtube.com/watch?v=abc")).isFalse();
        assertThat(VideoUrlPermitida.esPermitida("https://youtube.com.evil.com/x")).isFalse();
        assertThat(VideoUrlPermitida.esPermitida("https://evil.com@youtube.com/x")).isFalse();
        assertThat(VideoUrlPermitida.esPermitida("javascript:alert(1)")).isFalse();
        assertThatThrownBy(() -> VideoUrlPermitida.exigir("https://ejemplo-qa-test.com/v.mp4"))
            .isInstanceOf(IllegalArgumentException.class).hasMessage(VideoUrlPermitida.MENSAJE);
    }
}

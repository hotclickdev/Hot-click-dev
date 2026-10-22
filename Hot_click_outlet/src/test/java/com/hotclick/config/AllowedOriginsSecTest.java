package com.hotclick.config;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.assertj.core.api.Assertions.assertThat;
class AllowedOriginsSecTest {
  @ParameterizedTest
  @ValueSource(strings = {"http://[::1]:3000", "http://hotclick.lat", "http://0.0.0.0:3000", "https://hotclick.lat,http://192.168.1.10:3000"})
  void prodDebeRechazar(String raw) { assertThat(AllowedOrigins.problemaEnProduccion(raw)).as(raw).isNotNull(); }
}

package com.hotclick.config;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.assertj.core.api.Assertions.assertThat;
class AllowedOriginsBypassSecTest {
  @ParameterizedTest
  @ValueSource(strings = {"http://hotclick.lat","https://localhost","https://LOCALHOST","https://localhost.","https://[::1]","https://0.0.0.0",
    "https://10.0.0.1","https://192.168.1.1","https://172.16.0.1","https://169.254.1.1","https://[fe80::1]","https://[fd00::1]",
    "https://[::ffff:127.0.0.1]","https://2130706433","https://0x7f.1","https://127.1","https://0177.0.0.1","https://a@hotclick.lat","https://100.64.0.1"})
  void prodRechaza(String o) { assertThat(AllowedOrigins.problemaEnProduccion(o)).as(o).isNotNull(); }
}

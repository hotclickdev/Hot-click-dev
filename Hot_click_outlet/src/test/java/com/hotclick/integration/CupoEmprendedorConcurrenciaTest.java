package com.hotclick.integration;

import com.hotclick.service.CupoEmprendedorService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.OptionalInt;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Cupo de 70: la reserva es atómica con altas simultáneas")
class CupoEmprendedorConcurrenciaTest extends BaseIntegrationTest {

    @Autowired JdbcTemplate jdbc;
    @Autowired CupoEmprendedorService cupo;

    @BeforeEach
    void tabla() {
        jdbc.execute("CREATE TABLE IF NOT EXISTS hot_click_cupo_emprendedor_tb (id INT PRIMARY KEY, usados INT NOT NULL, limite INT NOT NULL)");
        jdbc.update("DELETE FROM hot_click_cupo_emprendedor_tb");
        jdbc.update("INSERT INTO hot_click_cupo_emprendedor_tb (id, usados, limite) VALUES (1, 65, 70)");
    }

    @AfterEach
    void limpiar() { jdbc.update("DELETE FROM hot_click_cupo_emprendedor_tb"); }

    @Test
    void treintaAltasSimultaneasSoloReservanLosCincoQueQuedan() throws Exception {
        Method reservar = CupoEmprendedorService.class.getDeclaredMethod("reservarCupoGratis");
        reservar.setAccessible(true);
        ExecutorService pool = Executors.newFixedThreadPool(12);
        CountDownLatch salida = new CountDownLatch(1);
        List<Future<Boolean>> res = new ArrayList<>();
        for (int i = 0; i < 30; i++) {
            res.add(pool.submit(() -> {
                salida.await();
                return ((OptionalInt) reservar.invoke(cupo)).isPresent();
            }));
        }
        salida.countDown();
        int ok = 0;
        for (Future<Boolean> f : res) if (f.get()) ok++;
        pool.shutdown();

        assertThat(ok).isEqualTo(5);
        assertThat(jdbc.queryForObject("SELECT usados FROM hot_click_cupo_emprendedor_tb WHERE id = 1", Integer.class))
            .isEqualTo(70);
    }
}

package com.hotclick.service.telegram;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** QA8 repro A8-C3: la dedup vive en memoria; con 2 instancias (2 réplicas) el mismo update_id se procesa dos veces. */
class TelegramUpdateDedupReproC3Test {

    @Test
    @DisplayName("A8-C3: el mismo update_id en dos instancias se acepta una sola vez")
    void mismoUpdateId_dosInstancias_soloUnaLoAcepta() {
        TelegramUpdateDedup replicaA = new TelegramUpdateDedup();
        TelegramUpdateDedup replicaB = new TelegramUpdateDedup();

        boolean a = replicaA.esNuevo(42L);
        boolean b = replicaB.esNuevo(42L);

        assertThat(a).isTrue();
        assertThat(b).as("la segunda réplica no debería ver el update 42 como nuevo").isFalse();
    }
}

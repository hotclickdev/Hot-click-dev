package com.hotclick.service.tenant;

/**
 * Uso actual de una empresa frente a los límites de su plan.
 * {@code cajas} cuenta los turnos abiertos: cada turno ocupa una caja (decisión 3.2 A).
 */
public record UsoTenant(long productos, long bodegas, long cajas, long usuarios) {
}

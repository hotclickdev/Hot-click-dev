package com.hotclick.agente.motor;

import java.util.Set;

/**
 * Opciones de una ejecución del motor.
 *
 * @param tono      tono del negocio; null usa el de las propiedades ({@code agente.tono.*})
 * @param excluidas herramientas que no se ofrecen ni se ejecutan aunque el perfil las permita
 */
public record OpcionesMotor(TonoAgente tono, Set<String> excluidas) {

    public static final OpcionesMotor POR_DEFECTO = new OpcionesMotor(null, Set.of());

    public OpcionesMotor {
        excluidas = excluidas == null ? Set.of() : Set.copyOf(excluidas);
    }

    public static OpcionesMotor conTono(TonoAgente tono) {
        return new OpcionesMotor(tono, Set.of());
    }
}

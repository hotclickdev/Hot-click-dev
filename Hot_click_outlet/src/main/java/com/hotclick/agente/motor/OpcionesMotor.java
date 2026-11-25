package com.hotclick.agente.motor;

import com.hotclick.agente.idioma.Idioma;

import java.util.Set;

/**
 * Opciones de una ejecución del motor.
 *
 * @param tono      tono del negocio; null usa el de las propiedades ({@code agente.tono.*})
 * @param excluidas herramientas que no se ofrecen ni se ejecutan aunque el perfil las permita
 * @param idioma    idioma de la respuesta (AG-39); null = español
 */
public record OpcionesMotor(TonoAgente tono, Set<String> excluidas, Idioma idioma) {

    public static final OpcionesMotor POR_DEFECTO = new OpcionesMotor(null, Set.of(), Idioma.ES);

    public OpcionesMotor {
        excluidas = excluidas == null ? Set.of() : Set.copyOf(excluidas);
        idioma = idioma == null ? Idioma.ES : idioma;
    }

    public OpcionesMotor(TonoAgente tono, Set<String> excluidas) {
        this(tono, excluidas, Idioma.ES);
    }

    public static OpcionesMotor conTono(TonoAgente tono) {
        return new OpcionesMotor(tono, Set.of(), Idioma.ES);
    }

    public OpcionesMotor conIdioma(Idioma nuevo) {
        return new OpcionesMotor(tono, excluidas, nuevo);
    }
}

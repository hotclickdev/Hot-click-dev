package com.hotclick.service.email;

/** BAJO 3 de #477: no hay {@code adminit.email} configurado; el aviso no salió y no debe marcarse como enviado. */
public class AdminItSinCorreoException extends RuntimeException {
    public AdminItSinCorreoException() { super("adminit.email sin configurar"); }
}

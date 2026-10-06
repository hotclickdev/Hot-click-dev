package com.hotclick.service.territorio;

/** Una fila del IGN: provincia, cantón y distrito, todavía sin normalizar. */
public record FilaDivision(String provincia, String canton, String distrito) {}

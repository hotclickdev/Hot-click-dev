package com.hotclick.service;

import com.hotclick.dto.ResultadoAltaCupo;
import com.hotclick.model.Empresa;

/** Liga la concesión ya consumida al negocio, en la misma transacción del alta. */
public final class QaAltaPymeTestVinculo {

    private QaAltaPymeTestVinculo() {}

    public static void ligar(ResultadoAltaCupo alta, Empresa empresa, QaAltaPymeTestService servicio) {
        if (alta == null || !alta.qaPymeCobroTest()) return;
        if (servicio == null || empresa == null || empresa.getId() == null) {
            throw new IllegalStateException("No se pudo ligar la excepción QA al negocio");
        }
        servicio.vincular(empresa.getId(), empresa.getCorreoEmpresa());
    }
}

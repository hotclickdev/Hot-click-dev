package com.hotclick.service.fiscal;

/**
 * Declaración jurada del registro: quien dice estar INSCRITO o en REGIMEN_SIMPLIFICADO acepta que es representante
 * legal o autorizado del negocio y que los datos fiscales son verdaderos. NO_INSCRITO o sin declarar no la necesitan.
 */
public final class DeclaracionFiscal {

    private DeclaracionFiscal() {}

    /** Lanza IllegalArgumentException (400) si la situación declarada la exige y no se aceptó. */
    public static void exigir(String situacionFiscal, Boolean acepta) {
        boolean declara = SituacionFiscal.desde(situacionFiscal)
            .filter(s -> s != SituacionFiscal.NO_INSCRITO).isPresent();
        if (declara && !Boolean.TRUE.equals(acepta)) {
            throw new IllegalArgumentException(EmpresaFiscalService.MENSAJE_DECLARACION);
        }
    }
}

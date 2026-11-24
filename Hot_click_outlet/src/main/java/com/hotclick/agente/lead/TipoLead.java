package com.hotclick.agente.lead;

/** Origen del interés: una persona que quiere comprar a un negocio, o un negocio que quiere vender en HotClick. */
public enum TipoLead {
    COMPRADOR(180),
    NEGOCIO(365);

    private final int retencionDias;

    TipoLead(int retencionDias) {
        this.retencionDias = retencionDias;
    }

    /** Días que se conserva el lead (Ley 8968): 6 meses compradores, 12 meses negocios. */
    public int retencionDias() { return retencionDias; }
}

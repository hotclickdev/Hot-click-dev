package com.hotclick.dto;

import com.hotclick.model.MetodoCobro;
import com.hotclick.service.MetodoCobroFormato;

public class MetodoCobroDto {

    private Long id;
    private String tipo;
    private String nombre;
    private String mascara;
    private String nota;
    private boolean predeterminado;

    public static MetodoCobroDto from(MetodoCobro m) {
        MetodoCobroDto dto = new MetodoCobroDto();
        dto.id = m.getId();
        dto.tipo = MetodoCobroFormato.tipoApi(m.getTipo());
        dto.nombre = MetodoCobroFormato.nombre(m.getTipo());
        dto.mascara = m.getMascara();
        dto.nota = MetodoCobroFormato.nota(m.getTipo());
        dto.predeterminado = m.isPredeterminado();
        return dto;
    }

    public Long getId() { return id; }
    public String getTipo() { return tipo; }
    public String getNombre() { return nombre; }
    public String getMascara() { return mascara; }
    public String getNota() { return nota; }
    public boolean isPredeterminado() { return predeterminado; }
}

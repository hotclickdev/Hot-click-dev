package com.hotclick.dto.inventario;

import java.util.ArrayList;
import java.util.List;

public class ImportarLineasResultado {

    private int validas;
    private int creadas;
    private int actualizadas;
    private List<String> errores = new ArrayList<>();
    private List<PaqueteLineaRequest> preview = new ArrayList<>();

    public int getValidas() { return validas; }
    public void setValidas(int validas) { this.validas = validas; }
    public int getCreadas() { return creadas; }
    public void setCreadas(int creadas) { this.creadas = creadas; }
    public int getActualizadas() { return actualizadas; }
    public void setActualizadas(int actualizadas) { this.actualizadas = actualizadas; }
    public List<String> getErrores() { return errores; }
    public void setErrores(List<String> errores) { this.errores = errores; }
    public List<PaqueteLineaRequest> getPreview() { return preview; }
    public void setPreview(List<PaqueteLineaRequest> preview) { this.preview = preview; }
}

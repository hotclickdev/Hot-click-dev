package com.hotclick.dto;

import java.util.HashMap;
import java.util.Map;

public class EncargoKpisDto {

    public long pendientes;
    public long aprobados;
    public long pendientePago;
    public long pagados;
    public long rechazados;
    public long vencidos;
    public long ticketPromedioCotizado;

    public static EncargoKpisDto desdeConteos(Map<String, Long> porEstado, long sumaPrecios, long countPrecios) {
        EncargoKpisDto dto = new EncargoKpisDto();
        dto.pendientes = porEstado.getOrDefault("PENDIENTE", 0L);
        dto.aprobados = porEstado.getOrDefault("APROBADO", 0L);
        dto.pendientePago = porEstado.getOrDefault("PENDIENTE_PAGO", 0L);
        dto.pagados = porEstado.getOrDefault("PAGADO", 0L);
        dto.rechazados = porEstado.getOrDefault("RECHAZADO", 0L);
        dto.vencidos = porEstado.getOrDefault("VENCIDO", 0L);
        dto.ticketPromedioCotizado = countPrecios > 0 ? sumaPrecios / countPrecios : 0L;
        return dto;
    }

    public Map<String, Object> toMap() {
        Map<String, Object> m = new HashMap<>();
        m.put("pendientes", pendientes);
        m.put("aprobados", aprobados);
        m.put("pendientePago", pendientePago);
        m.put("pagados", pagados);
        m.put("rechazados", rechazados);
        m.put("vencidos", vencidos);
        m.put("ticketPromedioCotizado", ticketPromedioCotizado);
        return m;
    }
}

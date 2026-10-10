package com.hotclick.service.consola;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.CrmPedidoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.crm.CrmAdminService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Personas de cada negocio, con lo que generan, para la consola. */
@Service
public class ConsolaCrmContactos {

    private final EmpresaRepository empresas;
    private final PedidoRepository pedidos;
    private final MiembroEmpresaRepository miembros;
    private final CrmPedidoRepository crmPedidos;

    public ConsolaCrmContactos(EmpresaRepository empresas,
                               PedidoRepository pedidos,
                               MiembroEmpresaRepository miembros,
                               CrmPedidoRepository crmPedidos) {
        this.empresas = empresas;
        this.pedidos = pedidos;
        this.miembros = miembros;
        this.crmPedidos = crmPedidos;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listar() {
        Map<Long, Long> ventas = ventas();
        Map<Long, long[]> cobro = pagadoYPendiente();
        Map<Long, Dueno> duenos = duenos();
        List<Map<String, Object>> filas = new ArrayList<>();
        for (Empresa empresa : empresas.findAllByOrderByFechaRegistroDesc()) {
            Map<String, Object> f = fila(empresa, ventas, duenos);
            long[] pp = cobro.getOrDefault(empresa.getId(), new long[] {0L, 0L});
            f.put("pagado", pp[0]);
            f.put("pendiente", pp[1]);
            filas.add(f);
        }
        filas.sort(Comparator.comparingLong(ConsolaCrmContactos::pagado).reversed()
            .thenComparing(Comparator.comparingLong(ConsolaCrmContactos::genera).reversed()));
        return filas;
    }

    private Map<String, Object> fila(Empresa empresa, Map<Long, Long> ventas, Map<Long, Dueno> duenos) {
        Dueno dueno = duenos.get(empresa.getId());
        String estado = empresa.getEstadoEmpresa() == null ? "" : empresa.getEstadoEmpresa();
        boolean enProceso = "PENDIENTE_APROBACION".equals(estado) || "PENDIENTE".equals(estado);
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("empresaId", empresa.getId());
        mapa.put("persona", dueno == null ? "Sin usuario en la ficha" : dueno.persona());
        mapa.put("correo", correo(empresa, dueno));
        mapa.put("negocio", nombre(empresa));
        mapa.put("telefono", telefono(empresa, dueno));
        mapa.put("estado", etiqueta(estado, enProceso));
        mapa.put("enProceso", enProceso);
        mapa.put("genera", ventas.getOrDefault(empresa.getId(), 0L));
        return mapa;
    }

    private Map<Long, Long> ventas() {
        Map<Long, Long> mapa = new HashMap<>();
        for (Object[] fila : pedidos.sumVentasPorEmpresa()) {
            Long id = idDe(fila[0]);
            if (id != null) mapa.put(id, largo(fila[1]));
        }
        return mapa;
    }

    /** QA-131-3: «genera» mezclaba pagados y pendientes; se separan con el criterio de pagado del CRM. */
    private Map<Long, long[]> pagadoYPendiente() {
        Map<Long, long[]> mapa = new HashMap<>();
        for (Object[] fila : crmPedidos.pagadoYPendientePorEmpresa(
                CrmAdminService.ESTADOS_PAGADOS, CrmAdminService.ESTADOS_PENDIENTES)) {
            Long id = idDe(fila[0]);
            if (id != null) mapa.put(id, new long[] {largo(fila[1]), largo(fila[2])});
        }
        return mapa;
    }

    private static long pagado(Map<String, Object> fila) {
        Object valor = fila.get("pagado");
        return valor instanceof Number numero ? numero.longValue() : 0L;
    }

    private Map<Long, Dueno> duenos() {
        Map<Long, Dueno> mapa = new HashMap<>();
        for (Object[] fila : miembros.propietariosParaConsola()) {
            Long id = idDe(fila[0]);
            if (id != null) mapa.putIfAbsent(id, new Dueno(texto(fila[1]), texto(fila[2]), texto(fila[3]), texto(fila[4])));
        }
        return mapa;
    }

    private static long genera(Map<String, Object> fila) {
        Object valor = fila.get("genera");
        return valor instanceof Number numero ? numero.longValue() : 0L;
    }

    private static String nombre(Empresa empresa) {
        if (empresa.getNombreComercial() != null && !empresa.getNombreComercial().isBlank()) {
            return empresa.getNombreComercial();
        }
        return empresa.getNombreEmpresa() == null ? "Negocio" : empresa.getNombreEmpresa();
    }

    private static String correo(Empresa empresa, Dueno dueno) {
        if (dueno != null && !dueno.correo().isBlank()) return dueno.correo();
        return empresa.getCorreoEmpresa() == null ? "" : empresa.getCorreoEmpresa().trim();
    }

    private static String telefono(Empresa empresa, Dueno dueno) {
        if (dueno != null && !dueno.telefono().isBlank()) return dueno.telefono();
        return empresa.getTelefonoEmpresa() == null ? "" : empresa.getTelefonoEmpresa();
    }

    private static String etiqueta(String estado, boolean enProceso) {
        if (enProceso) return "En proceso";
        if ("ACTIVO".equals(estado)) return "Activo";
        if ("SUSPENDIDO".equals(estado)) return "Suspendido";
        if ("INACTIVO".equals(estado)) return "Inactivo";
        return estado.isBlank() ? "En proceso" : estado;
    }

    private static Long idDe(Object valor) {
        return valor instanceof Number numero ? numero.longValue() : null;
    }

    private static long largo(Object valor) {
        return valor instanceof Number numero ? numero.longValue() : 0L;
    }

    private static String texto(Object valor) {
        return valor == null ? "" : valor.toString().trim();
    }

    private record Dueno(String nombre, String apellido, String telefono, String correo) {
        String persona() {
            String junto = (nombre + " " + apellido).trim();
            return junto.isBlank() ? "Sin nombre todavía" : junto;
        }
    }
}

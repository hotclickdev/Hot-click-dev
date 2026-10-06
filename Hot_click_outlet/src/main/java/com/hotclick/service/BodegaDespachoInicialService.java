package com.hotclick.service;

import com.hotclick.dto.UbicacionDespachoAlta;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Primera bodega de un negocio, creada en el alta con la ubicación de despacho.
 * Queda como bodega de venta online para que el negocio pueda aprobarse y publicar
 * (ver {@link UbicacionDespachoService#tieneUbicacion}).
 */
@Service
public class BodegaDespachoInicialService {

    public static final int MAX_PROVINCIA        = 50;
    public static final int MAX_CANTON           = 100;
    public static final int MAX_DIRECCION_EXACTA = 255;
    static final int MAX_NOMBRE_BODEGA = 100;
    static final int MAX_TELEFONO      = 20;
    static final String PREFIJO_NOMBRE_BODEGA = "Despacho ";
    /** Mismo relleno que usa el alta de usuario cuando no hay teléfono. */
    static final String TELEFONO_SIN_DATO = "00000000";

    public static final String MENSAJE_UBICACION_INCOMPLETA =
        "Completá la ubicación de despacho: provincia, cantón y dirección exacta.";

    private final BodegaRepository  bodegaRepository;
    private final EmpresaRepository empresaRepository;
    private final TenantService     tenantService;
    private final InputSanitizer    sanitizer;

    public BodegaDespachoInicialService(BodegaRepository bodegaRepository,
                                        EmpresaRepository empresaRepository,
                                        TenantService tenantService,
                                        InputSanitizer sanitizer) {
        this.bodegaRepository  = bodegaRepository;
        this.empresaRepository = empresaRepository;
        this.tenantService     = tenantService;
        this.sanitizer         = sanitizer;
    }

    /**
     * Limpia y normaliza la ubicación. Vacía si no vino ningún campo (clientes viejos);
     * lanza {@link IllegalArgumentException} si vino a medias o excede los largos de la bodega.
     * Llamar antes de escribir nada para no dejar un negocio a medio crear.
     */
    public Optional<UbicacionDespachoAlta> normalizar(UbicacionDespachoAlta cruda) {
        if (cruda == null) return Optional.empty();
        String provincia = sanitizer.normalizeGeo(sanitizer.clean(cruda.provincia()));
        String canton    = sanitizer.normalizeGeo(sanitizer.clean(cruda.canton()));
        String distrito  = sanitizer.normalizeGeo(sanitizer.clean(cruda.distrito()));
        String direccion = textoLimpio(cruda.direccionExacta());
        if (provincia.isEmpty() && canton.isEmpty() && direccion.isEmpty() && distrito.isEmpty()) return Optional.empty();
        if (provincia.isEmpty() || canton.isEmpty() || direccion.isEmpty()) {
            throw new IllegalArgumentException(MENSAJE_UBICACION_INCOMPLETA);
        }
        exigirLargo(provincia, MAX_PROVINCIA, "La provincia");
        exigirLargo(canton, MAX_CANTON, "El cantón");
        exigirLargo(distrito, MAX_CANTON, "El distrito");
        exigirLargo(direccion, MAX_DIRECCION_EXACTA, "La dirección exacta");
        boolean retiro = Boolean.TRUE.equals(cruda.permiteRetiroCliente());
        return Optional.of(new UbicacionDespachoAlta(provincia, canton, direccion, retiro, distrito));
    }

    /**
     * Crea la bodega con una ubicación ya pasada por {@link #normalizar} y la deja como
     * bodega de venta online del negocio. Respeta el límite de bodegas del plan.
     */
    @Transactional
    public Bodega crear(Empresa empresa, Usuario admin, UbicacionDespachoAlta ubicacion) {
        tenantService.verificarLimiteBodegas(empresa.getId());
        Bodega bodega = new Bodega();
        bodega.setNombreBodega(recortar(PREFIJO_NOMBRE_BODEGA + nombreVisible(empresa), MAX_NOMBRE_BODEGA));
        bodega.setTelefono(recortar(telefonoDe(empresa, admin), MAX_TELEFONO));
        bodega.setProvincia(ubicacion.provincia());
        bodega.setCanton(ubicacion.canton());
        bodega.setDistrito(ubicacion.distrito());
        bodega.setDireccionExacta(ubicacion.direccionExacta());
        bodega.setPermiteRetiroCliente(Boolean.TRUE.equals(ubicacion.permiteRetiroCliente()));
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega.setEmpresa(empresa);
        bodega.setAdminCliente(admin);
        bodega.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        Bodega guardada = bodegaRepository.save(bodega);
        empresa.setBodegaVentaOnline(guardada);
        empresaRepository.save(empresa);
        return guardada;
    }

    private String textoLimpio(String valor) {
        String limpio = sanitizer.clean(valor);
        return limpio == null ? "" : limpio;
    }

    private static void exigirLargo(String valor, int maximo, String campo) {
        if (valor.length() > maximo) {
            throw new IllegalArgumentException(campo + " no puede superar " + maximo + " caracteres.");
        }
    }

    private static String nombreVisible(Empresa empresa) {
        String comercial = empresa.getNombreComercial();
        return comercial != null && !comercial.isBlank() ? comercial : empresa.getNombreEmpresa();
    }

    private static String telefonoDe(Empresa empresa, Usuario admin) {
        if (noVacio(empresa.getTelefonoEmpresa())) return empresa.getTelefonoEmpresa().trim();
        if (admin != null && noVacio(admin.getTelefono())) return admin.getTelefono().trim();
        return TELEFONO_SIN_DATO;
    }

    private static String recortar(String valor, int maximo) {
        return valor.length() > maximo ? valor.substring(0, maximo) : valor;
    }

    private static boolean noVacio(String valor) {
        return valor != null && !valor.isBlank();
    }
}

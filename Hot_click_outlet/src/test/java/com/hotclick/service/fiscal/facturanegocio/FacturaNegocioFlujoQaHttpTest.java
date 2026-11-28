package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.integration.BaseIntegrationTest;
import com.hotclick.model.Bodega;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.EnlacePagoOnvo;
import com.hotclick.model.FacturaNegocio;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.AuditoriaAdminRepository;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.FacturaNegocioRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.onvo.cuenta.EnlacePagoOnvoService;
import com.hotclick.utils.Constants;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import static com.hotclick.service.fiscal.facturanegocio.FacturaNegocioXmlValidadorTest.CED_HOTCLICK;
import static com.hotclick.service.fiscal.facturanegocio.FacturaNegocioXmlValidadorTest.CED_NEGOCIO;
import static com.hotclick.service.fiscal.facturanegocio.FacturaNegocioXmlValidadorTest.CLAVE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * QA (PR #679): flujo completo de la factura del negocio sobre H2 con los servicios reales y por HTTP.
 * Quincena cerrada → generación (PENDIENTE / NO_APLICA) → subida de XML firmado → RECIBIDA → aprobación del ADMIN → ACEPTADA → evento → cancelación de
 * enlaces de ONVO (simulado); XML inválido → RECHAZADA; plazo vencido → VENCIDA. Más la matriz de autorización que
 * no cubre {@link com.hotclick.integration.FacturaNegocioHttpTest} (editor, staff con global.companies), aislamiento,
 * límite de subidas, tamaño y XXE por HTTP. Almacenamiento y ONVO simulados. Cédulas y correos ficticios.
 */
@DisplayName("QA Fase 2: flujo completo, matriz y bordes HTTP de la factura del negocio")
class FacturaNegocioFlujoQaHttpTest extends BaseIntegrationTest {

    @MockitoBean private EnlacePagoOnvoService onvo;

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private FacturaNegocioRepository facturaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private AuditoriaAdminRepository auditoriaRepository;

    private Empresa empA, empNoInscrito, empSinVerificar, empD;
    private Categoria categoria;
    private String tDuenoA, tCajeroA, tEditorA, tDuenoNoInscrito, tDuenoD, tStaff, tImpLectura;
    private int secuencia;
    private LocalDate hoy;

    @BeforeEach
    void setUp() {
        hoy = LocalDate.now(Constants.ZONA_CR);
        plataforma();
        empA = empresa("qa-fn-a", "INSCRITO", true);
        empNoInscrito = empresa("qa-fn-b", "NO_INSCRITO", false);
        empSinVerificar = empresa("qa-fn-c", "INSCRITO", false);
        empD = empresa("qa-fn-d", "INSCRITO", true);
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        tDuenoA = token(miembro("qa-fn-dueno-a@test.cr", "PROPIETARIO", rolEmp, empA), empA);
        tCajeroA = token(miembro("qa-fn-cajero-a@test.cr", "CAJERO", rolEmp, empA), empA);
        tEditorA = token(miembro("qa-fn-editor-a@test.cr", "EDITOR", rolEmp, empA), empA);
        tDuenoNoInscrito = token(miembro("qa-fn-dueno-b@test.cr", "PROPIETARIO", rolEmp, empNoInscrito), empNoInscrito);
        tDuenoD = token(miembro("qa-fn-dueno-d@test.cr", "PROPIETARIO", rolEmp, empD), empD);
        tImpLectura = "Bearer " + jwtUtil.generateImpersonationToken(adminUser.getCorreo(), adminUser.getId(),
            Constants.ROL_EMPRENDEDOR, empA.getId(), empA.getSlug(), adminUser.getId(), adminUser.getCorreo());
        tStaff = tokenPara(staffConPermiso(), Constants.ROL_SUPPORT);
        when(supabaseStorageService.subirXmlPrivado(any(), anyString())).thenReturn("privado/qa.xml");
        when(onvo.idsAbiertosDeFactura(anyLong(), anyLong())).thenReturn(List.of());
        when(onvo.cancelar(anyLong())).thenAnswer(inv -> {
            EnlacePagoOnvo e = new EnlacePagoOnvo();
            e.setEstado(EnlacePagoOnvo.CANCELADO);
            return e;
        });
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM hot_click_rol_permiso_tb");
        jdbcTemplate.update("DELETE FROM hot_click_permiso_tb");
        auditoriaRepository.deleteAll();
        facturaRepository.deleteAll();
        pedidoRepository.deleteAll();
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        if (categoria != null) categoriaRepository.delete(categoria);
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); u.setEmpresaRegistro(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── fixtures ────────────────────────────────────────────────────────────────────────────────────────────

    /** La empresa plataforma (id 1) es el receptor: su cédula jurídica es la que tiene que traer la factura. */
    private void plataforma() {
        Empresa existente = empresaRepository.findById(Constants.EMPRESA_PLATAFORMA_ID).orElse(null);
        if (existente != null) {
            existente.setCedulaJuridica(CED_HOTCLICK);
            empresaRepository.saveAndFlush(existente);
            return;
        }
        Empresa p = empresa("qa-fn-plataforma", null, false);
        jdbcTemplate.update("UPDATE hot_click_empresa_tb SET id_empresa = ?, cedula_juridica = ? WHERE id_empresa = ?",
            Constants.EMPRESA_PLATAFORMA_ID, CED_HOTCLICK, p.getId());
    }

    private Empresa empresa(String slug, String situacion, boolean verificado) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug); e.setNombreComercial(slug); e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        e.setSituacionFiscal(situacion);
        if (situacion != null) e.setCedulaFiscal(CED_NEGOCIO);
        e.setFiscalVerificado(verificado);
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario miembro(String correo, String rolEquipo, Rol rol, Empresa emp) {
        Usuario u = crearUsuario(correo, rolEquipo, rol);
        u.setEmpresa(emp);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, rolEquipo));
        return u;
    }

    private String token(Usuario u, Empresa emp) {
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());
    }

    private Usuario staffConPermiso() {
        Rol rol = obtenerOCrearRol(Constants.ROL_SUPPORT, 5);
        Usuario s = crearUsuario("qa-fn-staff@hotclick.cr", "Staff", rol);
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS hot_click_rol_permiso_tb "
            + "(fk_id_rol BIGINT, fk_id_permiso INT, fk_id_estado INT)");
        jdbcTemplate.update("INSERT INTO hot_click_permiso_tb (nombre_permiso, descripcion, modulo, fk_id_estado) "
            + "VALUES (?, ?, ?, 1)", Constants.PERM_GLOBAL_COMPANIES, "QA", "global");
        Integer idPermiso = jdbcTemplate.queryForObject(
            "SELECT id_permiso FROM hot_click_permiso_tb WHERE nombre_permiso = ?", Integer.class, Constants.PERM_GLOBAL_COMPANIES);
        jdbcTemplate.update("INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso, fk_id_estado) VALUES (?, ?, 1)",
            rol.getId(), idPermiso);
        return s;
    }

    /** Un pedido con un producto (con CAByS) en la fecha dada. */
    private void venta(Empresa emp, LocalDateTime cuando, String estado, int total, boolean prueba) {
        if (categoria == null) {
            categoria = new Categoria();
            categoria.setNombreCategoria("QA-Cat-FN");
            categoria.setEstado(Constants.ESTADO_ACTIVO);
            categoria.setAdminCliente(adminUser);
            categoria = categoriaRepository.saveAndFlush(categoria);
        }
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega QA FN " + (++secuencia));
        b.setDireccionExacta("Calle QA");
        b.setTelefono("00000011");
        b.setAdminCliente(adminUser);
        b.setEmpresa(emp);
        b.setEstado(Constants.ESTADO_ACTIVO);
        b = bodegaRepository.saveAndFlush(b);
        Producto pr = new Producto();
        pr.setNombreProducto("Camisa QA " + secuencia);
        pr.setDescripcionCorta("QA");
        pr.setSku("QA-FN-" + secuencia);
        pr.setPrecioVenta(total);
        pr.setPrecioCompra(total / 2);
        pr.setStockActual(5);
        pr.setStockMinimo(1);
        pr.setEstado(Constants.ESTADO_ACTIVO);
        pr.setVisibleCatalogo(true);
        pr.setCategoria(categoria);
        pr.setEmpresa(emp);
        pr.setBodega(b);
        pr.setAdminCliente(adminUser);
        pr.setFechaCreacion(LocalDateTime.now());
        pr.setCodigoCabys("4321150100101");
        pr = productoRepository.saveAndFlush(pr);
        Pedido p = new Pedido();
        p.setNumeroPedido("QA-FN-" + secuencia);
        p.setFechaPedido(cuando);
        p.setEstadoPedido(estado);
        p.setUsuarioFinal(testUser);
        p.setBodega(b);
        p.setEmpresa(emp);
        p.setSubtotal(total);
        p.setTotalPedido(total);
        p.setCostoTotalProductos(total / 2);
        p.setUtilidadBruta(total / 2);
        p.setMetodoPago("SINPE");
        p.setMetodoEnvio(Constants.ENVIO_DOMICILIO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setEsPrueba(prueba);
        p.setItems(new ArrayList<>());
        PedidoItem i = new PedidoItem();
        i.setPedido(p);
        i.setProducto(pr);
        i.setCantidad(1);
        i.setPrecioUnitarioMomento(total);
        i.setCostoUnitarioMomento(total / 2);
        i.setSubtotalItem(total);
        i.setUtilidadItem(total / 2);
        i.setDescuentoAplicado(0);
        i.setEstado(Constants.ESTADO_ACTIVO);
        p.getItems().add(i);
        pedidoRepository.saveAndFlush(p);
    }

    private FacturaNegocio registro(Empresa e, LocalDate desde, LocalDate hasta, LocalDate limite, String estado) {
        FacturaNegocio f = new FacturaNegocio();
        f.setEmpresaId(e.getId());
        f.setPeriodoDesde(desde);
        f.setPeriodoHasta(hasta);
        f.setMontoCrc(1130);
        f.setFechaLimite(limite);
        f.setEstado(estado);
        f.setCedulaFiscalEsperada(CED_NEGOCIO);
        f.setFechaCreacion(LocalDateTime.now());
        f.setFechaActualizacion(LocalDateTime.now());
        return facturaRepository.saveAndFlush(f);
    }

    private FacturaNegocio pendiente(Empresa e) {
        return registro(e, LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 15), hoy.plusDays(3), FacturaNegocio.PENDIENTE);
    }

    private static byte[] xmlValido() { return FacturaNegocioXmlValidadorTest.valido(); }

    private static byte[] respuestaHacienda(String mensaje) {
        return ("<MensajeHacienda xmlns=\"https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda\">"
            + "<Clave>" + CLAVE + "</Clave><NombreEmisor>NEGOCIO PRUEBA</NombreEmisor><Mensaje>" + mensaje + "</Mensaje>"
            + "</MensajeHacienda>").getBytes(StandardCharsets.UTF_8);
    }

    private static MockMultipartHttpServletRequestBuilder subir(Long id, byte[] xml, byte[] respuesta) {
        var b = MockMvcRequestBuilders.multipart("/api/empresa/facturas-hotclick/" + id + "/xml")
            .file(new MockMultipartFile("xml", "f.xml", "application/xml", xml));
        if (respuesta != null) b.file(new MockMultipartFile("respuesta", "r.xml", "application/xml", respuesta));
        return b;
    }

    private record Resp(int status, String body) {}

    private Resp hacer(MockHttpServletRequestBuilder b, String token) throws Exception {
        if (token != null) b.header("Authorization", token);
        var r = mockMvc.perform(b).andReturn().getResponse();
        return new Resp(r.getStatus(), r.getContentAsString(StandardCharsets.UTF_8));
    }

    private int st(MockHttpServletRequestBuilder b, String token) throws Exception { return hacer(b, token).status(); }

    private FacturaNegocio recargar(FacturaNegocio f) { return facturaRepository.findById(f.getId()).orElseThrow(); }

    private Map<Long, FacturaNegocio> porEmpresa() {
        return facturaRepository.findAll().stream().collect(Collectors.toMap(FacturaNegocio::getEmpresaId, f -> f));
    }

    // ── 1. flujo completo ───────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Cierra la quincena → genera PENDIENTE (inscrito verificado) y NO_APLICA (resto); repetir no duplica")
    void generacionIdempotente() throws Exception {
        var actual = FacturaNegocioCalculo.quincenaDe(hoy);
        LocalDateTime enQuincena = actual.desde().atTime(10, 0);
        venta(empA, enQuincena, Constants.PEDIDO_PAGADO, 20_000, false);
        venta(empA, enQuincena, Constants.PEDIDO_PENDIENTE, 50_000, false);   // no cuenta: no está pagado
        venta(empA, enQuincena, Constants.PEDIDO_PAGADO, 70_000, true);       // no cuenta: pedido de prueba
        venta(empNoInscrito, enQuincena, Constants.PEDIDO_PAGADO, 10_000, false);
        venta(empSinVerificar, enQuincena, Constants.PEDIDO_PAGADO, 10_000, false);
        venta(empD, actual.desde().minusDays(1).atTime(10, 0), Constants.PEDIDO_PAGADO, 10_000, false); // otra quincena
        String fecha = actual.hasta().plusDays(1).toString();   // "el día que cierra" la quincena en curso

        Resp r1 = hacer(post("/api/admin/facturas-negocio/generar?fecha=" + fecha), adminToken);
        assertThat(r1.status()).as(r1.body()).isEqualTo(200);
        assertThat((Integer) JsonPath.read(r1.body(), "$.data.creadas")).isEqualTo(3);

        Map<Long, FacturaNegocio> m = porEmpresa();
        assertThat(m).containsOnlyKeys(empA.getId(), empNoInscrito.getId(), empSinVerificar.getId());
        FacturaNegocio a = m.get(empA.getId());
        assertThat(a.getEstado()).isEqualTo(FacturaNegocio.PENDIENTE);
        assertThat(a.getPeriodoDesde()).isEqualTo(actual.desde());
        assertThat(a.getPeriodoHasta()).isEqualTo(actual.hasta());
        assertThat(a.getFechaLimite()).isEqualTo(actual.hasta().plusDays(7));
        assertThat(a.getMontoCrc()).isPositive().isLessThanOrEqualTo(20_000);
        assertThat(a.getDesgloseJson()).contains("4321150100101");
        assertThat(m.get(empNoInscrito.getId()).getEstado()).isEqualTo(FacturaNegocio.NO_APLICA);
        assertThat(m.get(empSinVerificar.getId()).getEstado()).isEqualTo(FacturaNegocio.NO_APLICA);

        // Idempotente: segunda corrida no crea ni cambia nada.
        Resp r2 = hacer(post("/api/admin/facturas-negocio/generar?fecha=" + fecha), adminToken);
        assertThat((Integer) JsonPath.read(r2.body(), "$.data.creadas")).isZero();
        assertThat(facturaRepository.count()).isEqualTo(3);
        assertThat(recargar(a).getMontoCrc()).isEqualTo(a.getMontoCrc());

        // El negocio ve su pendiente; el NO_APLICA ve el mensaje del recargo.
        Resp vistaA = hacer(get("/api/empresa/facturas-hotclick"), tDuenoA);
        assertThat((Integer) JsonPath.read(vistaA.body(), "$.data.pendiente.id")).isEqualTo(a.getId().intValue());
        assertThat((String) JsonPath.read(vistaA.body(), "$.data.receptor.cedula")).isEqualTo(CED_HOTCLICK);
        Resp vistaB = hacer(get("/api/empresa/facturas-hotclick"), tDuenoNoInscrito);
        assertThat((Boolean) JsonPath.read(vistaB.body(), "$.data.leCorrespondeFacturar")).isFalse();
        assertThat((String) JsonPath.read(vistaB.body(), "$.data.mensajeNoAplica")).contains("14 %");
    }

    @Test
    @DisplayName("XML válido + respuesta ACEPTADO → RECIBIDA; el ADMIN la aprueba → ACEPTADA y cancela los enlaces de ESA factura")
    void aceptadaDisparaEvento() throws Exception {
        FacturaNegocio f = pendiente(empA);
        when(onvo.idsAbiertosDeFactura(empA.getId(), f.getId())).thenReturn(List.of(71L, 72L));

        Resp r = hacer(subir(f.getId(), xmlValido(), respuestaHacienda("1")), tDuenoA);
        assertThat(r.status()).as(r.body()).isEqualTo(200);
        assertThat((String) JsonPath.read(r.body(), "$.data.estado")).as(r.body()).isEqualTo(FacturaNegocio.RECIBIDA);
        assertThat((String) JsonPath.read(r.body(), "$.data.mensajeEstado")).contains("pendiente de revisión");
        assertThat((List<?>) JsonPath.read(r.body(), "$.data.errores")).isEmpty();
        assertThat((List<?>) JsonPath.read(r.body(), "$.data.avisos")).isEmpty();
        // Recibida: todavía no se cancela nada.
        verify(onvo, after(500).never()).cancelar(anyLong());

        assertThat(st(post("/api/admin/facturas-negocio/" + f.getId() + "/aprobar"), adminToken)).isEqualTo(200);
        FacturaNegocio g = recargar(f);
        assertThat(g.getEstado()).isEqualTo(FacturaNegocio.ACEPTADA);
        assertThat(g.getClaveXml()).isEqualTo(CLAVE);
        assertThat(g.getRespuestaHaciendaEstado()).isEqualTo("ACEPTADO");
        assertThat(g.getTotalFacturaCrc()).isEqualTo(1130L);
        assertThat(g.getMensajeReceptorEstado()).isEqualTo(MensajeReceptorCodigos.ESTADO_ACEPTADA_INTERNA);
        verify(onvo, timeout(5_000)).cancelar(71L);
        verify(onvo, timeout(5_000)).cancelar(72L);

        // Ya aceptada: volver a subir → 409.
        assertThat(st(subir(f.getId(), xmlValido(), null), tDuenoA)).isEqualTo(409);
    }

    @Test
    @DisplayName("XML inválido → RECHAZADA con motivos claros, sin clave y sin evento")
    void invalidoRechazada() throws Exception {
        FacturaNegocio f = pendiente(empA);
        String alterado = new String(xmlValido(), StandardCharsets.UTF_8).replace("<Detalle>Camisa</Detalle>", "<Detalle>Otra</Detalle>");
        Resp r = hacer(subir(f.getId(), alterado.getBytes(StandardCharsets.UTF_8), null), tDuenoA);
        assertThat((String) JsonPath.read(r.body(), "$.data.estado")).isEqualTo(FacturaNegocio.RECHAZADA);
        List<String> errores = JsonPath.read(r.body(), "$.data.errores");
        assertThat(errores).anyMatch(e -> e.contains("firma digital"));
        assertThat(recargar(f).getClaveXml()).isNull();
        verify(onvo, after(500).never()).idsAbiertosDeFactura(any(), any());
    }

    @Test
    @DisplayName("Respuesta de Hacienda RECHAZADO con factura válida → RECHAZADA y sin evento")
    void respuestaHaciendaRechazada() throws Exception {
        FacturaNegocio f = pendiente(empA);
        Resp r = hacer(subir(f.getId(), xmlValido(), respuestaHacienda("3")), tDuenoA);
        assertThat((String) JsonPath.read(r.body(), "$.data.estado")).isEqualTo(FacturaNegocio.RECHAZADA);
        assertThat((String) JsonPath.read(r.body(), "$.data.respuestaHacienda")).isEqualTo("RECHAZADO");
        assertThat((List<String>) JsonPath.read(r.body(), "$.data.errores")).anyMatch(e -> e.contains("Hacienda no aceptó"));
        assertThat(recargar(f).getClaveXml()).isNull();
        verify(onvo, after(500).never()).idsAbiertosDeFactura(any(), any());
    }

    @Test
    @DisplayName("Riesgo corregido: firma autofirmada sin respuesta de Hacienda queda RECIBIDA (nunca ACEPTADA sola) y no cancela enlaces; "
        + "un certificado sin la cédula del emisor queda RECHAZADA")
    void autofirmadaSinRespuestaNoSeAcepta() throws Exception {
        FacturaNegocio f = pendiente(empA);
        when(onvo.idsAbiertosDeFactura(empA.getId(), f.getId())).thenReturn(List.of(90L));
        Resp r = hacer(subir(f.getId(), xmlValido(), null), tDuenoA);
        assertThat((String) JsonPath.read(r.body(), "$.data.estado")).isEqualTo(FacturaNegocio.RECIBIDA);
        assertThat((List<String>) JsonPath.read(r.body(), "$.data.avisos")).anyMatch(a -> a.contains("respuesta de Hacienda"));
        verify(onvo, after(500).never()).cancelar(anyLong());

        FacturaNegocio otra = pendiente(empD);
        byte[] ajena = com.hotclick.service.hacienda.CertificadoDePrueba.firmar(FacturaNegocioXmlValidadorTest.xmlBase())
            .getBytes(StandardCharsets.UTF_8);
        Resp s = hacer(subir(otra.getId(), ajena, null), tDuenoD);
        assertThat((String) JsonPath.read(s.body(), "$.data.estado")).isEqualTo(FacturaNegocio.RECHAZADA);
        assertThat((List<String>) JsonPath.read(s.body(), "$.data.errores")).anyMatch(e -> e.contains("no es de la cédula del emisor"));
    }

    @Test
    @DisplayName("Plazo vencido → VENCIDA (PENDIENTE y RECHAZADA); el día límite sigue PENDIENTE; VENCIDA aún acepta la factura")
    void vencida() throws Exception {
        FacturaNegocio vencePend = registro(empA, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 15), hoy.minusDays(1), FacturaNegocio.PENDIENTE);
        FacturaNegocio venceRech = registro(empA, LocalDate.of(2026, 1, 16), LocalDate.of(2026, 1, 31), hoy.minusDays(1), FacturaNegocio.RECHAZADA);
        FacturaNegocio diaLimite = registro(empA, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 15), hoy, FacturaNegocio.PENDIENTE);
        FacturaNegocio aceptada = registro(empA, LocalDate.of(2026, 2, 16), LocalDate.of(2026, 2, 28), hoy.minusDays(30), FacturaNegocio.ACEPTADA);
        FacturaNegocio noAplica = registro(empNoInscrito, LocalDate.of(2026, 2, 16), LocalDate.of(2026, 2, 28), hoy.minusDays(30), FacturaNegocio.NO_APLICA);

        Resp r = hacer(post("/api/admin/facturas-negocio/generar"), adminToken);
        assertThat((Integer) JsonPath.read(r.body(), "$.data.vencidas")).isEqualTo(2);
        assertThat(recargar(vencePend).getEstado()).isEqualTo(FacturaNegocio.VENCIDA);
        assertThat(recargar(venceRech).getEstado()).isEqualTo(FacturaNegocio.VENCIDA);
        assertThat(recargar(diaLimite).getEstado()).isEqualTo(FacturaNegocio.PENDIENTE);
        assertThat(recargar(aceptada).getEstado()).isEqualTo(FacturaNegocio.ACEPTADA);
        assertThat(recargar(noAplica).getEstado()).isEqualTo(FacturaNegocio.NO_APLICA);
        // Repetir no cambia nada.
        assertThat((Integer) JsonPath.read(hacer(post("/api/admin/facturas-negocio/generar"), adminToken).body(),
            "$.data.vencidas")).isZero();

        // Factura tardía: la VENCIDA todavía se puede subir; queda RECIBIDA y al aprobarla se cancela su cobro por atraso.
        when(onvo.idsAbiertosDeFactura(empA.getId(), vencePend.getId())).thenReturn(List.of(5L));
        Resp s = hacer(subir(vencePend.getId(), xmlValido(), respuestaHacienda("1")), tDuenoA);
        assertThat((String) JsonPath.read(s.body(), "$.data.estado")).isEqualTo(FacturaNegocio.RECIBIDA);
        assertThat(st(post("/api/admin/facturas-negocio/" + vencePend.getId() + "/aprobar"), adminToken)).isEqualTo(200);
        verify(onvo, timeout(5_000)).cancelar(5L);
    }

    // ── 2. matriz HTTP y aislamiento ────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Editor: ve (GET 200) pero no sube (403); staff global.companies: 403 en negocio y en ADMIN")
    void matrizEditorYStaff() throws Exception {
        FacturaNegocio f = pendiente(empA);
        assertThat(st(get("/api/empresa/facturas-hotclick"), tEditorA)).isEqualTo(200);
        assertThat(st(subir(f.getId(), xmlValido(), null), tEditorA)).isEqualTo(403);
        assertThat(st(get("/api/empresa/facturas-hotclick"), tStaff)).isEqualTo(403);
        assertThat(st(subir(f.getId(), xmlValido(), null), tStaff)).isEqualTo(403);
        String id = String.valueOf(f.getId());
        List<Supplier<MockHttpServletRequestBuilder>> rutas = List.of(
            () -> get("/api/admin/facturas-negocio"),
            () -> get("/api/admin/facturas-negocio/" + id),
            () -> post("/api/admin/facturas-negocio/" + id + "/aprobar"),
            () -> post("/api/admin/facturas-negocio/" + id + "/recordar"),
            () -> post("/api/admin/facturas-negocio/generar"));
        for (var ruta : rutas) {
            assertThat(st(ruta.get(), tStaff)).isEqualTo(403);
            assertThat(st(ruta.get(), tEditorA)).isEqualTo(403);
        }
        assertThat(recargar(f).getEstado()).isEqualTo(FacturaNegocio.PENDIENTE);
        assertThat(recargar(f).isRevisada()).isFalse();
    }

    @Test
    @DisplayName("Aislamiento: cajero e impersonación de A solo ven lo de A; dueño de D no sube a A (404)")
    void aislamiento() throws Exception {
        FacturaNegocio fa = pendiente(empA);
        FacturaNegocio fd = pendiente(empD);
        for (String t : new String[] {tCajeroA, tEditorA, tImpLectura}) {
            List<Integer> ids = JsonPath.read(hacer(get("/api/empresa/facturas-hotclick"), t).body(), "$.data.historial[*].id");
            assertThat(ids).containsExactly(fa.getId().intValue());
        }
        assertThat(st(subir(fa.getId(), xmlValido(), null), tDuenoD)).isEqualTo(404);
        assertThat(recargar(fa).getEstado()).isEqualTo(FacturaNegocio.PENDIENTE);
        assertThat(recargar(fd).getEstado()).isEqualTo(FacturaNegocio.PENDIENTE);
        // ADMIN: detalle de un id que no existe → 404; filtro de estado inválido → 400.
        assertThat(st(get("/api/admin/facturas-negocio/999999999"), adminToken)).isEqualTo(404);
        assertThat(st(get("/api/admin/facturas-negocio?estado=PAGADA"), adminToken)).isEqualTo(400);
    }

    @Test
    @DisplayName("Clave repetida entre negocios: A la usa y queda RECIBIDA; D (misma cédula) sube la misma → RECHAZADA")
    void claveRepetidaEntreNegocios() throws Exception {
        FacturaNegocio fa = pendiente(empA);
        FacturaNegocio fd = pendiente(empD);
        assertThat((String) JsonPath.read(hacer(subir(fa.getId(), xmlValido(), null), tDuenoA).body(), "$.data.estado"))
            .isEqualTo(FacturaNegocio.RECIBIDA);
        Resp r = hacer(subir(fd.getId(), xmlValido(), null), tDuenoD);
        assertThat((String) JsonPath.read(r.body(), "$.data.estado")).isEqualTo(FacturaNegocio.RECHAZADA);
        assertThat((List<String>) JsonPath.read(r.body(), "$.data.errores")).anyMatch(e -> e.contains("ya se subió antes"));
        assertThat(recargar(fd).getClaveXml()).isNull();
    }

    @Test
    @DisplayName("NO_APLICA: el dueño no puede subir (409 con el mensaje del recargo)")
    void noAplicaNoSube() throws Exception {
        FacturaNegocio f = registro(empNoInscrito, LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 15), hoy.plusDays(3),
            FacturaNegocio.NO_APLICA);
        Resp r = hacer(subir(f.getId(), xmlValido(), null), tDuenoNoInscrito);
        assertThat(r.status()).isEqualTo(409);
        assertThat(r.body()).contains("recargo");
    }

    // ── 3. bordes HTTP: tamaño, XXE ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Más de 1 MB (XML o respuesta) → 413 sin tocar el registro ni gastar el límite; 1 MB exacto pasa a revisión")
    void tamano() throws Exception {
        FacturaNegocio f = pendiente(empA);
        byte[] grande = new byte[XmlSeguro.MAX_BYTES + 1];
        java.util.Arrays.fill(grande, (byte) ' ');
        assertThat(st(subir(f.getId(), grande, null), tDuenoA)).isEqualTo(413);
        assertThat(st(subir(f.getId(), xmlValido(), grande), tDuenoA)).isEqualTo(413);
        assertThat(recargar(f).getEstado()).isEqualTo(FacturaNegocio.PENDIENTE);
        Integer usados = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hot_click_rate_limit_tb", Integer.class);
        assertThat(usados).isZero();
        byte[] exacto = new byte[XmlSeguro.MAX_BYTES];
        java.util.Arrays.fill(exacto, (byte) ' ');
        Resp r = hacer(subir(f.getId(), exacto, null), tDuenoA);
        assertThat(r.status()).isEqualTo(200);
        assertThat((String) JsonPath.read(r.body(), "$.data.estado")).isEqualTo(FacturaNegocio.RECHAZADA);
    }

    @Test
    @DisplayName("XXE por HTTP (en la factura y en la respuesta): RECHAZADA por DOCTYPE, sin contenido del archivo")
    void xxeHttp() throws Exception {
        FacturaNegocio f = pendiente(empA);
        byte[] xxe = ("<?xml version=\"1.0\"?><!DOCTYPE f [<!ENTITY x SYSTEM \"file:///etc/passwd\">]>"
            + "<FacturaElectronica>&x;</FacturaElectronica>").getBytes(StandardCharsets.UTF_8);
        Resp r = hacer(subir(f.getId(), xxe, null), tDuenoA);
        assertThat((String) JsonPath.read(r.body(), "$.data.estado")).isEqualTo(FacturaNegocio.RECHAZADA);
        assertThat(r.body()).contains("DOCTYPE").doesNotContain("root:");
        Resp r2 = hacer(subir(f.getId(), xmlValido(), xxe), tDuenoA);
        assertThat((String) JsonPath.read(r2.body(), "$.data.estado")).isEqualTo(FacturaNegocio.RECHAZADA);
        assertThat((List<String>) JsonPath.read(r2.body(), "$.data.errores")).anyMatch(e -> e.contains("DOCTYPE"));
    }

    // ── 4. límite de subidas ────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Límite: 10 subidas por día y negocio; la 11.ª da 429; otro negocio no se ve afectado")
    void limiteSubidas() throws Exception {
        FacturaNegocio fa = pendiente(empA);
        FacturaNegocio fd = pendiente(empD);
        byte[] basura = "<x/>".getBytes(StandardCharsets.UTF_8);
        for (int i = 1; i <= 10; i++) {
            assertThat(st(subir(fa.getId(), basura, null), tDuenoA)).as("subida " + i).isEqualTo(200);
        }
        Resp r = hacer(subir(fa.getId(), xmlValido(), null), tDuenoA);
        assertThat(r.status()).isEqualTo(429);
        assertThat(r.body()).contains("mañana");
        assertThat(recargar(fa).getEstado()).isEqualTo(FacturaNegocio.RECHAZADA);
        assertThat(st(subir(fd.getId(), basura, null), tDuenoD)).isEqualTo(200);
        verify(onvo, never()).idsAbiertosDeFactura(any(), any());
    }
}

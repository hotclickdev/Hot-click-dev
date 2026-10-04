package com.hotclick.service.catalogo;

import org.apache.pdfbox.cos.COSDictionary;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.cos.COSStream;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDResources;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("R2: imágenes embebidas del PDF se topan por diccionario, sin decodificar")
class CatalogoPdfImagenEmbebidaTest {

    @Test
    @DisplayName("imagen embebida de 30000×30000 → IllegalArgumentException (400)")
    void imagenGigante() throws Exception {
        try (PDDocument doc = new PDDocument()) {
            PDResources recursos = recursosCon(doc, "Im1", imagen(doc, 30_000, 30_000));
            assertThatThrownBy(() -> CatalogoPdfExtractor.verificarImagenesEmbebidas(recursos))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(CatalogoPdfExtractor.MSG_IMAGEN_EMBEBIDA_GRANDE);
        }
    }

    @Test
    @DisplayName("imagen gigante dentro de un Form XObject también se rechaza")
    void imagenGiganteEnForm() throws Exception {
        try (PDDocument doc = new PDDocument()) {
            COSStream form = doc.getDocument().createCOSStream();
            form.setItem(COSName.SUBTYPE, COSName.FORM);
            form.setItem(COSName.RESOURCES, recursosCon(doc, "Im1", imagen(doc, 30_000, 30_000)).getCOSObject());
            PDResources recursos = recursosCon(doc, "Fm1", form);
            assertThatThrownBy(() -> CatalogoPdfExtractor.verificarImagenesEmbebidas(recursos))
                .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    @DisplayName("imagen normal y página sin recursos pasan")
    void imagenNormal() throws Exception {
        try (PDDocument doc = new PDDocument()) {
            PDResources recursos = recursosCon(doc, "Im1", imagen(doc, 2_000, 1_500));
            assertThatCode(() -> CatalogoPdfExtractor.verificarImagenesEmbebidas(recursos)).doesNotThrowAnyException();
            assertThatCode(() -> CatalogoPdfExtractor.verificarImagenesEmbebidas(null)).doesNotThrowAnyException();
        }
    }

    /** XObject de imagen con solo el diccionario: si alguien la decodificara, fallaría (no hay datos). */
    private static COSStream imagen(PDDocument doc, int ancho, int alto) {
        COSStream img = doc.getDocument().createCOSStream();
        img.setItem(COSName.TYPE, COSName.XOBJECT);
        img.setItem(COSName.SUBTYPE, COSName.IMAGE);
        img.setInt(COSName.WIDTH, ancho);
        img.setInt(COSName.HEIGHT, alto);
        img.setInt(COSName.BITS_PER_COMPONENT, 8);
        img.setItem(COSName.COLORSPACE, COSName.DEVICEGRAY);
        return img;
    }

    private static PDResources recursosCon(PDDocument doc, String nombre, COSStream xobjeto) {
        COSDictionary xobjetos = new COSDictionary();
        xobjetos.setItem(COSName.getPDFName(nombre), xobjeto);
        PDResources recursos = new PDResources();
        recursos.getCOSObject().setItem(COSName.XOBJECT, xobjetos);
        return recursos;
    }
}

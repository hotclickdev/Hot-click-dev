import PasoFotos from './PasoFotos'
import PasoNombre from './PasoNombre'
import PasoDescripcion from './PasoDescripcion'
import PasoPrecios from './PasoPrecios'
import PasoClasificacion from './PasoClasificacion'
import PasoDetalles from './PasoDetalles'
import PasoContenido from './PasoContenido'
import PasoSeo from './PasoSeo'

/** Switch de pasos del wizard de nuevo producto. */
export default function WizardStepSwitch({ wizard }) {
  const {
    STEPS, wizardStep,
    tieneBorrador, onCargarBorrador, onLimpiarBorrador,
    analizando, analizandoIdx, imagenesFile, previewUrls,
    onAddFiles, onRemoveFile, onAnalizar, onSkip,
    form, setCampo, setForm, trademarkWarning,
    priceWarning, setPriceWarning,
    categories, bodegas, marcas, loadingCatalog, sinBodegas,
    showNuevaMarca, setShowNuevaMarca, nuevaMarca, setNuevaMarca,
    creandoMarca, onCrearMarca,
    seoLang, setSeoLang, seoAuto, setSeoAuto,
  } = wizard

  const id = STEPS[wizardStep]?.id
  if (id === 'fotos') {
    return (
      <PasoFotos
        tieneBorrador={tieneBorrador}
        onCargarBorrador={onCargarBorrador}
        onLimpiarBorrador={onLimpiarBorrador}
        analizando={analizando}
        analizandoIdx={analizandoIdx}
        imagenesFile={imagenesFile}
        previewUrls={previewUrls}
        onAddFiles={onAddFiles}
        onRemoveFile={onRemoveFile}
        onAnalizar={onAnalizar}
        onSkip={onSkip}
      />
    )
  }
  if (id === 'nombre') return <PasoNombre form={form} setCampo={setCampo} trademarkWarning={trademarkWarning} />
  if (id === 'descripcion') return <PasoDescripcion form={form} setCampo={setCampo} />
  if (id === 'precios') return <PasoPrecios form={form} setCampo={setCampo} priceWarning={priceWarning} setPriceWarning={setPriceWarning} />
  if (id === 'clasificacion') {
    return (
      <PasoClasificacion
        form={form} setCampo={setCampo} setForm={setForm}
        categories={categories} bodegas={bodegas} marcas={marcas}
        loadingCatalog={loadingCatalog} sinBodegas={sinBodegas}
        showNuevaMarca={showNuevaMarca} setShowNuevaMarca={setShowNuevaMarca}
        nuevaMarca={nuevaMarca} setNuevaMarca={setNuevaMarca}
        creandoMarca={creandoMarca} onCrearMarca={onCrearMarca}
      />
    )
  }
  if (id === 'detalles') return <PasoDetalles form={form} setCampo={setCampo} setForm={setForm} />
  if (id === 'contenido') return <PasoContenido form={form} setCampo={setCampo} setForm={setForm} />
  if (id === 'seo') {
    return (
      <PasoSeo
        form={form} setForm={setForm}
        seoLang={seoLang} setSeoLang={setSeoLang}
        seoAuto={seoAuto} setSeoAuto={setSeoAuto}
      />
    )
  }
  return null
}

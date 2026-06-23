import { useRef } from 'react'
import { useImageEditor } from '../hooks/useImageEditor'
import { CanvasViewport } from './CanvasViewport'
import { Toolbar } from './Toolbar'
import { BackgroundPanel } from '../panels/BackgroundPanel'
import { ExportPanel } from '../panels/ExportPanel'
import { ResizePanel } from '../panels/ResizePanel'

export function ImageEditor() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    canvas,
    fileName,
    tool,
    cropRect,
    historyLength,
    isProcessing,
    bgProgress,
    error,
    dimensions,
    loadFile,
    setTool,
    setCropRect,
    applyCrop,
    applyResize,
    removeBackground,
    undo,
    clearError,
  } = useImageEditor()

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      await loadFile(file)
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'No se pudo cargar la imagen'
      alert(message)
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="editor">
      <header className="editor__header">
        <div>
          <h1>Editor de imágenes</h1>
          <p className="editor__subtitle">Recorta, redimensiona, quita fondos y exporta sin subir archivos a la nube.</p>
        </div>

        <div className="editor__actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="secondary-button"
            onClick={() => fileInputRef.current?.click()}
          >
            Subir imagen
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={!canvas || historyLength === 0 || isProcessing}
            onClick={undo}
          >
            Deshacer
          </button>
        </div>
      </header>

      {error ? (
        <div className="editor__alert" role="alert">
          <span>{error}</span>
          <button type="button" className="link-button" onClick={clearError}>
            Cerrar
          </button>
        </div>
      ) : null}

      {!canvas ? (
        <section className="editor__empty">
          <div className="empty-card">
            <h2>Comienza subiendo una imagen</h2>
            <p>Formatos habituales: PNG, JPEG, WebP, GIF.</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => fileInputRef.current?.click()}
            >
              Seleccionar archivo
            </button>
          </div>
        </section>
      ) : (
        <div className="editor__workspace">
          <section className="editor__preview">
            <div className="preview-meta">
              <span>{fileName}</span>
              {dimensions ? (
                <span>
                  {dimensions.width} × {dimensions.height} px
                </span>
              ) : null}
            </div>

            <CanvasViewport
              canvas={canvas}
              showCrop={tool === 'crop'}
              cropRect={cropRect}
              onCropChange={setCropRect}
            />
          </section>

          <aside className="editor__sidebar">
            <Toolbar activeTool={tool} disabled={isProcessing} onSelect={setTool} />

            <div className="editor__panel">
              {tool === 'crop' && cropRect ? (
                <div className="panel">
                  <h2>Recortar</h2>
                  <p className="panel__hint">
                    Arrastra el recuadro o sus esquinas para definir el área. Luego aplica el recorte.
                  </p>
                  <p className="panel__meta">
                    Selección: {Math.round(cropRect.width)} × {Math.round(cropRect.height)} px
                  </p>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={isProcessing}
                    onClick={applyCrop}
                  >
                    Aplicar recorte
                  </button>
                </div>
              ) : null}

              {tool === 'resize' && dimensions ? (
                <ResizePanel
                  key={`${dimensions.width}x${dimensions.height}`}
                  width={dimensions.width}
                  height={dimensions.height}
                  disabled={isProcessing}
                  onApply={applyResize}
                />
              ) : null}

              {tool === 'background' ? (
                <BackgroundPanel
                  disabled={isProcessing}
                  isProcessing={isProcessing}
                  progress={bgProgress}
                  onRemove={removeBackground}
                />
              ) : null}

              {tool === 'export' ? (
                <ExportPanel canvas={canvas} fileName={fileName} disabled={isProcessing} />
              ) : null}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

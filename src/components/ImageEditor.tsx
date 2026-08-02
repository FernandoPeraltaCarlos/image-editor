import { useEffect, useRef } from 'react'
import { useImageEditor } from '../hooks/useImageEditor'
import { CanvasViewport } from './CanvasViewport'
import { HistoryPanel } from './HistoryPanel'
import { Toolbar } from './Toolbar'
import { BackgroundPanel } from '../panels/BackgroundPanel'
import { CropPanel } from '../panels/CropPanel'
import { ExportPanel } from '../panels/ExportPanel'
import { ResizePanel } from '../panels/ResizePanel'

export function ImageEditor() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    canvas,
    fileName,
    tool,
    cropRect,
    cropAspect,
    historyEntries,
    currentHistoryIndex,
    canUndo,
    isProcessing,
    bgProgress,
    error,
    dimensions,
    loadFile,
    setTool,
    setCropRect,
    setCropAspect,
    applyCrop,
    applyResize,
    removeBackground,
    undo,
    restoreTo,
    restoreOriginal,
    clearError,
  } = useImageEditor()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        if (canUndo && !isProcessing) {
          undo()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canUndo, isProcessing, undo])

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
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
          >
            Subir imagen
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={!canvas || !canUndo || isProcessing}
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
              cropAspect={cropAspect}
              onCropChange={setCropRect}
            />

            <HistoryPanel
              entries={historyEntries}
              currentIndex={currentHistoryIndex}
              disabled={isProcessing}
              onSelect={restoreTo}
              onRestoreOriginal={restoreOriginal}
            />
          </section>

          <aside className="editor__sidebar">
            <Toolbar activeTool={tool} disabled={isProcessing} onSelect={setTool} />

            <div className="editor__panel">
              {tool === 'crop' && cropRect && dimensions ? (
                <CropPanel
                  rect={cropRect}
                  imageWidth={dimensions.width}
                  imageHeight={dimensions.height}
                  aspect={cropAspect}
                  disabled={isProcessing}
                  onChange={setCropRect}
                  onAspectChange={setCropAspect}
                  onApply={applyCrop}
                />
              ) : null}

              {tool === 'resize' && dimensions ? (
                <ResizePanel
                  key={`${dimensions.width}x${dimensions.height}`}
                  width={dimensions.width}
                  height={dimensions.height}
                  disabled={isProcessing}
                  isProcessing={isProcessing}
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

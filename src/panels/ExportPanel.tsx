import { useState } from 'react'
import { buildExportFilename, downloadCanvas, isWebpSupported } from '../lib/export'
import type { ExportFormat } from '../lib/types'

interface ExportPanelProps {
  canvas: HTMLCanvasElement
  fileName: string
  disabled: boolean
}

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'image/png', label: 'PNG (transparencia)' },
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/webp', label: 'WebP' },
]

export function ExportPanel({ canvas, fileName, disabled }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('image/png')
  const [quality, setQuality] = useState(0.92)
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const webpSupported = isWebpSupported()
  const showQuality = format === 'image/jpeg' || format === 'image/webp'

  const handleExport = async () => {
    if (format === 'image/webp' && !webpSupported) {
      setMessage('WebP no está soportado en este navegador. Usa PNG o JPEG.')
      return
    }

    setIsExporting(true)
    setMessage(null)

    try {
      await downloadCanvas(
        canvas,
        buildExportFilename(fileName, format),
        format,
        showQuality ? quality : undefined,
      )
      setMessage('Descarga iniciada.')
    } catch (error) {
      const text = error instanceof Error ? error.message : 'No se pudo exportar la imagen'
      setMessage(text)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="panel">
      <h2>Exportar</h2>
      <p className="panel__hint">Convierte y descarga la imagen en el formato seleccionado.</p>

      <label className="field">
        <span>Formato</span>
        <select
          value={format}
          disabled={disabled || isExporting}
          onChange={(event) => setFormat(event.target.value as ExportFormat)}
        >
          {FORMATS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {showQuality ? (
        <label className="field">
          <span>Calidad ({Math.round(quality * 100)}%)</span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.01}
            value={quality}
            disabled={disabled || isExporting}
            onChange={(event) => setQuality(Number(event.target.value))}
          />
        </label>
      ) : null}

      {!webpSupported ? (
        <p className="panel__warning">WebP no está disponible en este navegador.</p>
      ) : null}

      <button
        type="button"
        className="primary-button"
        disabled={disabled || isExporting}
        onClick={handleExport}
      >
        {isExporting ? 'Exportando…' : 'Descargar imagen'}
      </button>

      {message ? <p className="panel__message">{message}</p> : null}
    </div>
  )
}
